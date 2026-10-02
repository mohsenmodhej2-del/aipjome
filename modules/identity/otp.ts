import { ensureSeedData } from '../bootstrap/seed';
import { database, newId, timestamp } from '../core/database';
import { DomainError } from '../core/errors';
import { enforceKeyRateLimit, hashPassword, hashToken, secureToken } from '../core/security';
import { sendOtpSms } from '../notifications/sms';
import { createSession, publicUser, type SessionUser } from './service';

const CODE_TTL_MS = 2 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export function normalizePhone(value?: string) {
  const digits = (value ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s\-()]/g, '');
  const phone = digits.replace(/^(\+98|0098|98)(?=9\d{9}$)/, '0').replace(/^(?=9\d{9}$)/, '0');
  if (!/^09\d{9}$/.test(phone)) throw new DomainError(400, 'شماره موبایل معتبر نیست (مثال: 09121234567).');
  return phone;
}

function randomCode() {
  const values = new Uint32Array(1);
  let n: number;
  do n = crypto.getRandomValues(values)[0]; while (n >= 4294000000); // avoid modulo bias
  return String(n % 1000000).padStart(6, '0');
}

const codeHash = (phone: string, code: string) => hashToken(`${phone}:${code}`);

export async function requestLoginCode(input: { phone?: string }) {
  const phone = normalizePhone(input.phone);
  await enforceKeyRateLimit(`otp_phone:${phone}`, 5, 60 * 60 * 1000);
  const db = database();
  const existing = await db.prepare('SELECT sent_at FROM otp_codes WHERE phone=?').bind(phone).first<{ sent_at: string }>();
  const wait = existing ? Date.parse(existing.sent_at) + RESEND_COOLDOWN_MS - Date.now() : 0;
  if (wait > 0) throw new DomainError(429, `برای ارسال دوباره ${Math.ceil(wait / 1000)} ثانیه صبر کنید.`);
  const code = randomCode();
  await db
    .prepare('INSERT INTO otp_codes (phone,code_hash,expires_at,attempts,sent_at) VALUES (?,?,?,0,?) ON CONFLICT(phone) DO UPDATE SET code_hash=excluded.code_hash, expires_at=excluded.expires_at, attempts=0, sent_at=excluded.sent_at')
    .bind(phone, await codeHash(phone, code), new Date(Date.now() + CODE_TTL_MS).toISOString(), timestamp())
    .run();
  try {
    await sendOtpSms(phone, code);
  } catch (error) {
    await db.prepare('DELETE FROM otp_codes WHERE phone=?').bind(phone).run();
    throw error;
  }
  return { phone, expiresIn: CODE_TTL_MS / 1000, resendIn: RESEND_COOLDOWN_MS / 1000 };
}

export async function verifyLoginCode(input: { phone?: string; code?: string; name?: string }) {
  const phone = normalizePhone(input.phone);
  const code = (input.code ?? '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).trim();
  if (!/^\d{6}$/.test(code)) throw new DomainError(400, 'کد تأیید باید ۶ رقم باشد.');
  const db = database();
  const row = await db.prepare('SELECT code_hash,expires_at,attempts FROM otp_codes WHERE phone=?').bind(phone).first<{ code_hash: string; expires_at: string; attempts: number }>();
  if (!row || Date.parse(row.expires_at) <= Date.now()) throw new DomainError(400, 'کد منقضی شده است؛ دوباره درخواست کد بدهید.');
  if (row.attempts >= MAX_ATTEMPTS) {
    await db.prepare('DELETE FROM otp_codes WHERE phone=?').bind(phone).run();
    throw new DomainError(429, 'تعداد تلاش‌ها زیاد بود؛ دوباره درخواست کد بدهید.');
  }
  if ((await codeHash(phone, code)) !== row.code_hash) {
    await db.prepare('UPDATE otp_codes SET attempts=attempts+1 WHERE phone=?').bind(phone).run();
    throw new DomainError(401, 'کد تأیید درست نیست.');
  }
  await db.prepare('DELETE FROM otp_codes WHERE phone=?').bind(phone).run();

  await ensureSeedData();
  let user = await db.prepare('SELECT id,email,name,role,is_active FROM users WHERE phone=? LIMIT 1').bind(phone).first<SessionUser & { is_active: number }>();
  if (user && !user.is_active) throw new DomainError(403, 'این حساب غیرفعال است.');
  if (!user) {
    const name = input.name?.trim() || `کاربر ${phone.slice(-4)}`;
    if (name.length > 80) throw new DomainError(400, 'نام حداکثر ۸۰ حرف است.');
    user = { id: newId(), email: `${phone}@sms.hamechi.local`, name, role: 'customer', is_active: 1 };
    // Phone-only accounts get an unguessable random password; they always sign in with an SMS code.
    await db
      .prepare('INSERT INTO users (id,email,phone,name,password_hash,role,is_active,created_at) VALUES (?,?,?,?,?,?,1,?)')
      .bind(user.id, user.email, phone, name, await hashPassword(secureToken()), 'customer', timestamp())
      .run();
  }
  return { user: publicUser(user)!, token: await createSession(user.id) };
}
