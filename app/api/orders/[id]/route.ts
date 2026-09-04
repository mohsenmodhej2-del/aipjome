import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { requireUser } from '@/lib/server';
import { orderDetails } from '../route';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const orders = await orderDetails(user.id, id);
    return NextResponse.json({ order: orders[0] ?? null });
  } catch (error) {
    return apiError(error);
  }
}
