import { writeAudit } from '../audit/service';
import { database, newId, timestamp } from '../core/database';
import { DomainError } from '../core/errors';

export async function confirmMockPayment(customerId: string, orderId?: string) {
  if (!orderId || orderId.length > 80) throw new DomainError(400, 'شناسه سفارش معتبر نیست.');
  const db = database();
  const order = await db.prepare('SELECT id,status,payment_status FROM orders WHERE id=? AND customer_id=? LIMIT 1').bind(orderId, customerId).first<{ id: string; status: string; payment_status: string }>();
  if (!order) throw new DomainError(404, 'سفارش پیدا نشد.');
  const returnUrl = `/?payment=success&order=${encodeURIComponent(orderId)}`;
  if (order.payment_status === 'paid') return { returnUrl };
  if (order.status !== 'pending_payment') throw new DomainError(409, 'این سفارش دیگر قابل پرداخت نیست.');
  const items = await db.prepare('SELECT product_id,owner_category_id,title,quantity,unit_price FROM order_items WHERE order_id=?').bind(orderId).all<{ product_id: string; owner_category_id: string; title: string; quantity: number; unit_price: number }>();
  for (const item of items.results) {
    const product = await db.prepare("SELECT stock,status FROM products WHERE id=? LIMIT 1").bind(item.product_id).first<{ stock: number; status: string }>();
    if (!product || product.status !== 'published' || product.stock < item.quantity) throw new DomainError(409, 'موجودی یکی از کالاها در این لحظه کافی نیست.');
  }
  const paidAt = timestamp();
  const categories = [...new Set(items.results.map((item) => item.owner_category_id))];
  const invoiceNumber = `H-${paidAt.slice(0, 10).replaceAll('-', '')}-${orderId.slice(0, 8).toUpperCase()}`;
  await db.batch([
    ...items.results.map((item) => db.prepare('UPDATE products SET stock=stock-?,updated_at=? WHERE id=? AND stock>=?').bind(item.quantity, paidAt, item.product_id, item.quantity)),
    db.prepare("UPDATE orders SET status='processing',payment_status='paid',paid_at=? WHERE id=? AND customer_id=? AND status='pending_payment'").bind(paidAt, orderId, customerId),
    db.prepare('INSERT INTO invoices (id,order_id,number,snapshot,issued_at) VALUES (?,?,?,?,?)').bind(newId(), orderId, invoiceNumber, JSON.stringify({ items: items.results, payment: 'mock' }), paidAt),
    ...categories.map((categoryId) => db.prepare("INSERT INTO fulfillments (id,order_id,owner_category_id,status,created_at) VALUES (?,?,?,'pending',?)").bind(newId(), orderId, categoryId, paidAt)),
  ]);
  await writeAudit(customerId, 'payment.mock_confirmed', 'order', orderId, { payment: 'mock', status: 'paid' });
  return { returnUrl };
}
