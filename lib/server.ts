import { env } from 'cloudflare:workers';
import type { NextRequest } from 'next/server';

type RuntimeEnv = { DB: D1Database };
export type UserRole = 'customer' | 'super_admin' | 'category_admin';
export type SessionUser = { id: string; email: string; name: string; role: UserRole };

const runtime = env as unknown as RuntimeEnv;
const encoder = new TextEncoder();
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export function db() {
  return runtime.DB;
}

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function asAppError(error: unknown) {
  return error instanceof AppError ? error : new AppError(500, 'خطای غیرمنتظره رخ داد.');
}

function hex(bytes: ArrayBufferLike | Uint8Array) {
  const values = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return [...values].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function hexToBytes(value: string) {
  return Uint8Array.from(value.match(/.{1,2}/g) ?? [], (part) => Number.parseInt(part, 16));
}

export async function passwordHash(password: string, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as ArrayBuffer, iterations: 120000 }, material, 256);
  return `${hex(salt)}:${hex(bits)}`;
}

export async function passwordMatches(password: string, stored: string) {
  const [saltHex] = stored.split(':');
  if (!saltHex) return false;
  return (await passwordHash(password, hexToBytes(saltHex))) === stored;
}

async function tokenHash(token: string) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
}

function randomToken() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== request.nextUrl.origin) throw new AppError(403, 'درخواست نامعتبر است.');
}

export async function enforceRateLimit(request: NextRequest, action: string, maximum: number, windowMs: number) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'local';
  const key = `${action}:${ip}`;
  const database = db();
  const existing = await database.prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?').bind(key).first<{ count: number; reset_at: string }>();
  const current = Date.now();
  if (!existing || Date.parse(existing.reset_at) <= current) {
    await database.prepare('INSERT INTO rate_limits (key, count, reset_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET count = excluded.count, reset_at = excluded.reset_at').bind(key, 1, new Date(current + windowMs).toISOString()).run();
    return;
  }
  if (existing.count >= maximum) throw new AppError(429, 'تعداد تلاش‌ها زیاد است؛ چند دقیقه دیگر دوباره امتحان کنید.');
  await database.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
}

export async function ensureSeedData() {
  const database = db();
  const existing = await database.prepare('SELECT id FROM users LIMIT 1').first<{ id: string }>();
  if (existing) return;

  const createdAt = now();
  const adminId = id();
  const categoryAdminId = id();
  const customerId = id();
  const [adminHash, categoryAdminHash, customerHash] = await Promise.all([
    passwordHash('Admin123!'),
    passwordHash('Category123!'),
    passwordHash('Customer123!'),
  ]);
  const categoryRows = [
    ['electronics', '/electronics', 'الکترونیک', 'electronics', 0],
    ['clothing', '/clothing', 'پوشاک', 'clothing', 0],
    ['beauty', '/beauty', 'آرایشی', 'beauty', 0],
    ['health', '/health', 'سلامت', 'health', 1],
  ] as const;
  const productRows = [
    ['p-headphones', 'electronics', 'هدفون بی‌سیم استودیو', 'صدای دقیق، اتصال پایدار و طراحی سبک برای استفادهٔ روزانه.', 4890000, 12, '8% 72%'],
    ['p-knit', 'clothing', 'بافت یقه‌دار آجری', 'بافت نرم با تن‌خور آزاد؛ موجود در سایزهای M و L.', 1240000, 18, '39% 67%'],
    ['p-serum', 'beauty', 'سرم آبرسان روزانه', 'فرمول سبک برای روتین مراقبت روزانهٔ پوست.', 690000, 24, '63% 74%'],
    ['p-vitamin', 'health', 'مکمل ویتامین روزانه', 'اطلاعات و هشدارهای مصرف را پیش از خرید مطالعه کنید.', 385000, 30, '74% 75%'],
  ] as const;
  const statements: D1PreparedStatement[] = [
    database.prepare('INSERT INTO users (id, email, name, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(adminId, 'admin@hamechi.test', 'مدیر همه‌چی', adminHash, 'super_admin', 1, createdAt),
    database.prepare('INSERT INTO users (id, email, name, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(categoryAdminId, 'category@hamechi.test', 'ادمین پوشاک و سلامت', categoryAdminHash, 'category_admin', 1, createdAt),
    database.prepare('INSERT INTO users (id, email, name, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(customerId, 'customer@hamechi.test', 'مشتری نمونه', customerHash, 'customer', 1, createdAt),
    ...categoryRows.map((row) => database.prepare('INSERT INTO categories (id, path, name, slug, requires_approval, is_archived) VALUES (?, ?, ?, ?, ?, 0)').bind(...row)),
    database.prepare('INSERT INTO assignments (id, user_id, category_id, role, granted_by, granted_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id(), categoryAdminId, 'clothing', 'category_admin', adminId, createdAt),
    database.prepare('INSERT INTO assignments (id, user_id, category_id, role, granted_by, granted_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id(), categoryAdminId, 'health', 'category_admin', adminId, createdAt),
    ...productRows.map((row) => database.prepare('INSERT INTO products (id, owner_category_id, title, description, status, price, stock, image_position, attributes, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(row[0], row[1], row[2], row[3], 'published', row[4], row[5], row[6], '{}', adminId, createdAt)),
  ];
  await database.batch(statements);
  await database.prepare('PRAGMA optimize').run();
}

export async function createSession(userId: string) {
  const token = randomToken();
  const database = db();
  await database.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)').bind(id(), userId, await tokenHash(token), new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), now()).run();
  return token;
}

export async function deleteSession(token: string | undefined) {
  if (!token) return;
  await db().prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await tokenHash(token)).run();
}

export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  await ensureSeedData();
  const token = request.cookies.get('hamechi_session')?.value;
  if (!token) return null;
  const user = await db().prepare('SELECT users.id, users.email, users.name, users.role FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.is_active = 1 LIMIT 1').bind(await tokenHash(token), now()).first<SessionUser>();
  return user ?? null;
}

export async function requireUser(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) throw new AppError(401, 'برای ادامه وارد حساب کاربری شوید.');
  return user;
}

export async function categoryScope(user: SessionUser) {
  if (user.role === 'super_admin') return null;
  const rows = await db().prepare("SELECT DISTINCT target.id, target.path FROM assignments JOIN categories root ON root.id = assignments.category_id JOIN categories target ON target.path = root.path OR substr(target.path,1,length(root.path)+1) = root.path || '/' WHERE assignments.user_id = ? AND assignments.role = ? AND target.is_archived = 0").bind(user.id, 'category_admin').all<{ id: string; path: string }>();
  return rows.results;
}

export async function canManageCategory(user: SessionUser, categoryId: string) {
  if (user.role === 'super_admin') return true;
  if (user.role !== 'category_admin') return false;
  const target = await db().prepare('SELECT path FROM categories WHERE id = ?').bind(categoryId).first<{ path: string }>();
  if (!target) return false;
  const scopes = await categoryScope(user);
  return Boolean(scopes?.some((scope) => target.path === scope.path || target.path.startsWith(`${scope.path}/`)));
}

export async function recordAudit(actorId: string | null, action: string, entity: string, entityId: string, after: unknown, scopeUsed: string | null = null) {
  await db().prepare('INSERT INTO audit_log (id, actor_id, action, entity, entity_id, after, scope_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id(), actorId, action, entity, entityId, JSON.stringify(after), scopeUsed, now()).run();
}

export function publicUser(user: SessionUser | null) {
  return user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null;
}
