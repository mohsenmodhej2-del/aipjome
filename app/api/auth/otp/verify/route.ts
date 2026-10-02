import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { assertSameOrigin, enforceRateLimit } from '@/modules/core/security';
import { verifyLoginCode } from '@/modules/identity/otp';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request); await enforceRateLimit(request, 'otp_verify', 10, 10 * 60 * 1000);
    const result = await verifyLoginCode(await safeJson(request));
    const response = NextResponse.json({ user: result.user });
    response.cookies.set('hamechi_session', result.token, { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: 604800 });
    return response;
  } catch (error) { return apiError(error); }
}
