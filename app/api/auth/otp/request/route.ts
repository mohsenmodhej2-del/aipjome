import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { assertSameOrigin, enforceRateLimit } from '@/modules/core/security';
import { requestLoginCode } from '@/modules/identity/otp';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request); await enforceRateLimit(request, 'otp_request', 5, 10 * 60 * 1000);
    return NextResponse.json(await requestLoginCode(await safeJson(request)));
  } catch (error) { return apiError(error); }
}
