import { database } from '../core/database';
import { DomainError } from '../core/errors';
import type { SessionUser } from '../identity/service';

export async function invoiceFor(user: SessionUser, orderId: string) {
  const order = await database().prepare('SELECT orders.id,orders.customer_id,orders.status,orders.payment_status,orders.total,orders.shipping_address,orders.created_at,orders.paid_at,users.name AS customer_name,users.email AS customer_email,invoices.number FROM orders JOIN users ON users.id=orders.customer_id LEFT JOIN invoices ON invoices.order_id=orders.id WHERE orders.id=? LIMIT 1').bind(orderId).first<{ id: string; customer_id: string; status: string; payment_status: string; total: number; shipping_address: string; created_at: string; paid_at: string | null; customer_name: string; customer_email: string; number: string | null }>();
  if (!order || (user.role !== 'super_admin' && order.customer_id !== user.id)) throw new DomainError(404, 'سفارش پیدا نشد.');
  const items = await database().prepare('SELECT title,quantity,unit_price FROM order_items WHERE order_id=?').bind(orderId).all();
  return {
    number: order.number ?? `PROFORMA-${order.id.slice(0, 8).toUpperCase()}`,
    issuedAt: order.paid_at ?? order.created_at,
    store: { name: 'فروشگاه همه‌چی', note: order.payment_status === 'paid' ? 'فاکتور فروش آزمایشی — فاقد اعتبار مالیاتی' : 'پیش‌فاکتور — پرداخت نشده' },
    order: { id: order.id, status: order.status, paymentStatus: order.payment_status, total: order.total, shippingAddress: order.shipping_address },
    customer: { name: order.customer_name, email: order.customer_email },
    items: items.results,
  };
}
