import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { assertSameOrigin } from '@/modules/core/security';
import { requireUser } from '@/modules/identity/service';
import { managementRequests, respondToRequest } from '@/modules/support/service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ requests: await managementRequests(user) });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    await respondToRequest(user, await safeJson(request));
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
