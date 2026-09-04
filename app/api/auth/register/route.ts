import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { AppError, assertSameOrigin, createSession, db, enforceRateLimit, ensureSeedData, passwordHash, publicUser } from '@/lib/server';

type RegisterBody = { email?: string; password?: string; name?: string };

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, 'register', 3, 60 * 60 * 1000);
    const body = await safeJson<RegisterBody>(request);
    const email = body.email?.trim().toLowerCase() ?? '';
    const name = body.name?.trim() ?? '';
    const password = body.password ?? '';
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 160) throw new AppError(400, 'یک ایمیل معتبر وارد کنید.');
    if (name.length < 2 || name.length > 80) throw new AppError(400, 'نام باید بین ۲ تا ۸۰ حرف باشد.');
    if (password.length < 10 || password.length > 128) throw new AppError(400, 'رمز عبور باید حداقل ۱۰ کاراکتر باشد.');
    await ensureSeedData();
    const exists = await db().prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(email).first();
    if (exists) throw new AppError(409, 'این ایمیل قبلاً ثبت شده است.');
    const user = { id: crypto.randomUUID(), email, name, role: 'customer' as const };
    await db().prepare('INSERT INTO users (id, email, name, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)').bind(user.id, user.email, user.name, await passwordHash(password), user.role, new Date().toISOString()).run();
    const token = await createSession(user.id);
    const response = NextResponse.json({ user: publicUser(user) }, { status: 201 });
    response.cookies.set('hamechi_session', token, { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
