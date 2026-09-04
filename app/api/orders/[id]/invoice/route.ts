import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { AppError, db, requireUser } from '@/lib/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const order = await db().prepare('SELECT orders.id, orders.customer_id, orders.status, orders.payment_status, orders.total, orders.shipping_address, orders.created_at, orders.paid_at, users.name AS customer_name, users.email AS customer_email FROM orders JOIN users ON users.id = orders.customer_id WHERE orders.id = ? LIMIT 1').bind(id).first<{ id: string; customer_id: string; status: string; payment_status: string; total: number; shipping_address: string; created_at: string; paid_at: string | null; customer_name: string; customer_email: string }>();
    if (!order) throw new AppError(404, 'سفارش پیدا نشد.');
    if (user.role !== 'super_admin' && order.customer_id !== user.id) throw new AppError(404, 'سفارش پیدا نشد.');
    const items = await db().prepare('SELECT title, quantity, unit_price FROM order_items WHERE order_id = ?').bind(id).all();
    const invoiceNumber = `H-${order.created_at.slice(0, 10).replaceAll('-', '')}-${order.id.slice(0, 8).toUpperCase()}`;
    return NextResponse.json({ invoice: { number: invoiceNumber, issuedAt: order.paid_at ?? order.created_at, store: { name: 'فروشگاه همه‌چی', note: 'فاکتور فروش آزمایشی — فاقد اعتبار مالیاتی' }, order: { id: order.id, status: order.status, paymentStatus: order.payment_status, total: order.total, shippingAddress: order.shipping_address }, customer: { name: order.customer_name, email: order.customer_email }, items: items.results } });
  } catch (error) {
    return apiError(error);
  }
}
