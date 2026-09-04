import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { requireUser } from '@/modules/identity/service';
import { customerOrders } from '@/modules/orders/service';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const orders = await customerOrders(user.id, id);
    return NextResponse.json({ order: orders[0] ?? null });
  } catch (error) {
    return apiError(error);
  }
}
