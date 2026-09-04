import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { assertSameOrigin, enforceRateLimit } from '@/modules/core/security';
import { registerCustomer } from '@/modules/identity/service';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request); await enforceRateLimit(request, 'register', 3, 60 * 60 * 1000);
    const result = await registerCustomer(await safeJson(request));
    const response = NextResponse.json({ user: result.user }, { status: 201 });
    response.cookies.set('hamechi_session', result.token, { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: 604800 });
    return response;
  } catch (error) { return apiError(error); }
}
