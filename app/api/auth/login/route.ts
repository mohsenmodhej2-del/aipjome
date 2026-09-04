import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { AppError, assertSameOrigin, createSession, db, enforceRateLimit, ensureSeedData, passwordMatches, publicUser } from '@/lib/server';

type LoginBody = { email?: string; password?: string };

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, 'login', 5, 10 * 60 * 1000);
    const body = await safeJson<LoginBody>(request);
    const email = body.email?.trim().toLowerCase() ?? '';
    const password = body.password ?? '';
    if (!email || !password || email.length > 160) throw new AppError(400, 'ایمیل و رمز عبور را وارد کنید.');
    await ensureSeedData();
    const user = await db().prepare('SELECT id, email, name, role, password_hash FROM users WHERE email = ? AND is_active = 1 LIMIT 1').bind(email).first<{ id: string; email: string; name: string; role: 'customer' | 'super_admin' | 'category_admin'; password_hash: string }>();
    if (!user || !(await passwordMatches(password, user.password_hash))) throw new AppError(401, 'ایمیل یا رمز عبور درست نیست.');
    const token = await createSession(user.id);
    const response = NextResponse.json({ user: publicUser(user) });
    response.cookies.set('hamechi_session', token, { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
