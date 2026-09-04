import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { assertSameOrigin } from '@/modules/core/security';
import { requireUser } from '@/modules/identity/service';
import { customerOrders, placeOrder, type PlaceOrderInput } from '@/modules/orders/service';


export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ orders: await customerOrders(user.id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    return NextResponse.json(await placeOrder(user.id, await safeJson<PlaceOrderInput>(request)), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
