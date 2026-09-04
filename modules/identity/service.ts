import type { NextRequest } from 'next/server';
import { ensureSeedData } from '../bootstrap/seed';
import { database, newId, timestamp } from '../core/database';
import { DomainError } from '../core/errors';
import { hashPassword, hashToken, passwordIsValid, secureToken } from '../core/security';

export type UserRole = 'customer' | 'super_admin' | 'category_admin';
export type SessionUser = { id: string; email: string; name: string; role: UserRole };

export async function createSession(userId: string) {
  const token = secureToken();
  await database().prepare('INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)').bind(newId(), userId, await hashToken(token), new Date(Date.now() + 604800000).toISOString(), timestamp()).run();
  return token;
}

export async function deleteSession(token?: string) {
  if (token) await database().prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await hashToken(token)).run();
}

export async function currentUser(request: NextRequest): Promise<SessionUser | null> {
  await ensureSeedData();
  const token = request.cookies.get('hamechi_session')?.value;
  if (!token) return null;
  return (await database().prepare('SELECT users.id,users.email,users.name,users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>? AND users.is_active=1 LIMIT 1').bind(await hashToken(token), timestamp()).first<SessionUser>()) ?? null;
}

export async function requireUser(request: NextRequest) {
  const user = await currentUser(request);
  if (!user) throw new DomainError(401, 'برای ادامه وارد حساب کاربری شوید.');
  return user;
}

export function publicUser(user: SessionUser | null) {
  return user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null;
}

export async function authenticate(input: { email?: string; password?: string }) {
  const email = input.email?.trim().toLowerCase() ?? '';
  const password = input.password ?? '';
  if (!email || !password || email.length > 160) throw new DomainError(400, 'ایمیل و رمز عبور را وارد کنید.');
  await ensureSeedData();
  const user = await database().prepare('SELECT id,email,name,role,password_hash FROM users WHERE email=? AND is_active=1 LIMIT 1').bind(email).first<SessionUser & { password_hash: string }>();
  if (!user || !(await passwordIsValid(password, user.password_hash))) throw new DomainError(401, 'ایمیل یا رمز عبور درست نیست.');
  return { user: publicUser(user)!, token: await createSession(user.id) };
}

export async function registerCustomer(input: { email?: string; password?: string; name?: string }) {
  const email = input.email?.trim().toLowerCase() ?? '';
  const name = input.name?.trim() ?? '';
  const password = input.password ?? '';
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 160) throw new DomainError(400, 'یک ایمیل معتبر وارد کنید.');
  if (name.length < 2 || name.length > 80) throw new DomainError(400, 'نام باید بین ۲ تا ۸۰ حرف باشد.');
  if (password.length < 10 || password.length > 128) throw new DomainError(400, 'رمز عبور باید حداقل ۱۰ کاراکتر باشد.');
  await ensureSeedData();
  if (await database().prepare('SELECT id FROM users WHERE email=? LIMIT 1').bind(email).first()) throw new DomainError(409, 'این ایمیل قبلاً ثبت شده است.');
  const user: SessionUser = { id: newId(), email, name, role: 'customer' };
  await database().prepare('INSERT INTO users (id,email,name,password_hash,role,is_active,created_at) VALUES (?,?,?,?,?,1,?)').bind(user.id, email, name, await hashPassword(password), user.role, timestamp()).run();
  return { user: publicUser(user)!, token: await createSession(user.id) };
}
