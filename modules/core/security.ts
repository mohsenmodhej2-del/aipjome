import type { NextRequest } from 'next/server';
import { database } from './database';
import { DomainError } from './errors';

const encoder = new TextEncoder();

function hex(bytes: ArrayBufferLike | Uint8Array) {
  const values = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return [...values]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(value: string) {
  return Uint8Array.from(value.match(/.{1,2}/g) ?? [], (part) =>
    Number.parseInt(part, 16),
  );
}

export async function hashPassword(
  password: string,
  salt = crypto.getRandomValues(new Uint8Array(16)),
) {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt as unknown as ArrayBuffer,
      iterations: 120000,
    },
    material,
    256,
  );
  return `${hex(salt)}:${hex(bits)}`;
}

export async function passwordIsValid(password: string, stored: string) {
  const [saltHex] = stored.split(':');
  return Boolean(saltHex) && (await hashPassword(password, hexToBytes(saltHex))) === stored;
}

export async function hashToken(token: string) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
}

export function secureToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== request.nextUrl.origin)
    throw new DomainError(403, 'درخواست نامعتبر است.');
}

export async function enforceRateLimit(
  request: NextRequest,
  action: string,
  maximum: number,
  windowMs: number,
) {
  await enforceKeyRateLimit(
    `${action}:${request.headers.get('cf-connecting-ip') ?? 'local'}`,
    maximum,
    windowMs,
  );
}

export async function enforceKeyRateLimit(
  key: string,
  maximum: number,
  windowMs: number,
) {
  const existing = await database()
    .prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?')
    .bind(key)
    .first<{ count: number; reset_at: string }>();
  const current = Date.now();
  if (!existing || Date.parse(existing.reset_at) <= current) {
    await database()
      .prepare(
        'INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at',
      )
      .bind(key, new Date(current + windowMs).toISOString())
      .run();
    return;
  }
  if (existing.count >= maximum)
    throw new DomainError(
      429,
      'تعداد تلاش‌ها زیاد است؛ چند دقیقه دیگر دوباره امتحان کنید.',
    );
  await database()
    .prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?')
    .bind(key)
    .run();
}
