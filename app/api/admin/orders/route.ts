import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { DomainError } from '@/modules/core/errors';
import { requireUser } from '@/modules/identity/service';
import { allOrders } from '@/modules/orders/service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (user.role !== 'super_admin') throw new DomainError(403, 'فهرست کامل سفارش‌ها فقط برای مدیر کل است.');
    return NextResponse.json({ orders: await allOrders() });
  } catch (error) {
    return apiError(error);
  }
}
