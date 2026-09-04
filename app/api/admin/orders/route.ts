import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { AppError, db, requireUser } from '@/lib/server';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (user.role !== 'super_admin') throw new AppError(403, 'فهرست کامل سفارش‌ها فقط برای مدیر کل است.');
    const orders = await db().prepare('SELECT orders.id, orders.status, orders.payment_status, orders.total, orders.shipping_address, orders.created_at, orders.paid_at, users.name AS customer_name, users.email AS customer_email FROM orders JOIN users ON users.id = orders.customer_id ORDER BY orders.created_at DESC LIMIT 200').all();
    return NextResponse.json({ orders: orders.results });
  } catch (error) {
    return apiError(error);
  }
}
