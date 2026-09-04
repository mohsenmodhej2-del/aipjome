import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { assertSameOrigin } from '@/modules/core/security';
import { requireUser } from '@/modules/identity/service';
import { createRequest, customerRequests, type SupportInput } from '@/modules/support/service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ requests: await customerRequests(user.id) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const result = await createRequest(user.id, await safeJson<SupportInput>(request));
    return NextResponse.json(result, { status: 201 });
  } catch (error) { return apiError(error); }
}
