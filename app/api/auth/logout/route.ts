import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { assertSameOrigin, deleteSession } from '@/lib/server';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await deleteSession(request.cookies.get('hamechi_session')?.value);
    const response = NextResponse.json({ ok: true });
    response.cookies.set('hamechi_session', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
