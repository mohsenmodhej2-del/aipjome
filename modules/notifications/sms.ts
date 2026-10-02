import { env } from 'cloudflare:workers';
import { DomainError } from '../core/errors';

// Melipayamak REST web service (same endpoints as github.com/Melipayamak/melipayamak-node, src/sms/rest.js).
const ENDPOINT = 'https://rest.payamak-panel.com/api/SendSMS';

type SmsEnv = {
  MELIPAYAMAK_USERNAME?: string;
  MELIPAYAMAK_PASSWORD?: string;
  MELIPAYAMAK_BODY_ID?: string;
  MELIPAYAMAK_FROM?: string;
  SMS_DEV_MODE?: string;
};
type RestResult = { Value?: string; RetStatus?: number; StrRetStatus?: string };

const smsEnv = () => env as unknown as SmsEnv;

export function smsDevMode() {
  return smsEnv().SMS_DEV_MODE === 'true';
}

async function call(method: string, params: Record<string, string>) {
  const { MELIPAYAMAK_USERNAME: username, MELIPAYAMAK_PASSWORD: password } = smsEnv();
  if (!username || !password) throw new DomainError(503, 'سرویس پیامک هنوز پیکربندی نشده است.');
  const response = await fetch(`${ENDPOINT}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: new URLSearchParams({ username, password, ...params }),
  });
  const result = (await response.json().catch(() => ({}))) as RestResult;
  // On success Value is the message recId (a long number); short values are Melipayamak error codes.
  if (!response.ok || result.RetStatus !== 1 || (result.Value ?? '').length < 5) {
    console.error('Melipayamak error', method, response.status, result.RetStatus, result.Value, result.StrRetStatus);
    throw new DomainError(502, 'ارسال پیامک ناموفق بود؛ کمی بعد دوباره امتحان کنید.');
  }
  return result.Value!;
}

/** Sends a login code. Uses the shared service line with an approved pattern when MELIPAYAMAK_BODY_ID is set. */
export async function sendOtpSms(phone: string, code: string) {
  const { MELIPAYAMAK_BODY_ID: bodyId, MELIPAYAMAK_FROM: from } = smsEnv();
  if (smsDevMode()) {
    console.log(`[SMS_DEV_MODE] login code for ${phone}: ${code}`);
    return 'dev';
  }
  if (bodyId) return call('BaseServiceNumber', { to: phone, bodyId, text: code });
  if (from) return call('SendSMS', { to: phone, from, text: `کد ورود شما به همه‌چی: ${code}\nاین کد را به کسی ندهید.`, isFlash: 'false' });
  throw new DomainError(503, 'سرویس پیامک هنوز پیکربندی نشده است.');
}
