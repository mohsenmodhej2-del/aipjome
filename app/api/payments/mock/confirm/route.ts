import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { assertSameOrigin } from '@/modules/core/security';
import { requireUser } from '@/modules/identity/service';
import { confirmMockPayment } from '@/modules/payments/service';

type ConfirmBody = { orderId?: string };

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { orderId } = await safeJson<ConfirmBody>(request);
    return NextResponse.json(await confirmMockPayment(user.id, orderId));
  } catch (error) {
    return apiError(error);
  }
}
