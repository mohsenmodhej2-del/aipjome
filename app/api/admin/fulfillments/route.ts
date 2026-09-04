import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { assertSameOrigin } from '@/modules/core/security';
import { updateFulfillment } from '@/modules/fulfillment/service';
import { requireUser } from '@/modules/identity/service';

export async function PATCH(request: NextRequest) {
  try { assertSameOrigin(request); await updateFulfillment(await requireUser(request), await safeJson(request)); return NextResponse.json({ ok: true }); }
  catch (error) { return apiError(error); }
}
