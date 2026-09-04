import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { AppError, assertSameOrigin, db, requireUser, recordAudit } from '@/lib/server';

type ConfirmBody = { orderId?: string };

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { orderId } = await safeJson<ConfirmBody>(request);
    if (!orderId || orderId.length > 80) throw new AppError(400, 'شناسه سفارش معتبر نیست.');
    const database = db();
    const order = await database.prepare('SELECT id, status, payment_status FROM orders WHERE id = ? AND customer_id = ? LIMIT 1').bind(orderId, user.id).first<{ id: string; status: string; payment_status: string }>();
    if (!order) throw new AppError(404, 'سفارش پیدا نشد.');
    if (order.payment_status === 'paid') return NextResponse.json({ returnUrl: `/?payment=success&order=${encodeURIComponent(orderId)}` });
    if (order.status !== 'pending_payment') throw new AppError(409, 'این سفارش دیگر قابل پرداخت نیست.');
    const items = await database.prepare('SELECT product_id, owner_category_id, quantity FROM order_items WHERE order_id = ?').bind(orderId).all<{ product_id: string; owner_category_id: string; quantity: number }>();
    for (const item of items.results) {
      const product = await database.prepare("SELECT stock, status FROM products WHERE id = ? LIMIT 1").bind(item.product_id).first<{ stock: number; status: string }>();
      if (!product || product.status !== 'published' || product.stock < item.quantity) throw new AppError(409, 'موجودی یکی از کالاها در این لحظه کافی نیست.');
    }
    const createdAt = new Date().toISOString();
    const categoryIds = [...new Set(items.results.map((item) => item.owner_category_id))];
    const statements: D1PreparedStatement[] = [
      ...items.results.map((item) => database.prepare('UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ? AND stock >= ?').bind(item.quantity, createdAt, item.product_id, item.quantity)),
      database.prepare("UPDATE orders SET status = 'processing', payment_status = 'paid', paid_at = ? WHERE id = ? AND customer_id = ? AND status = 'pending_payment'").bind(createdAt, orderId, user.id),
      ...categoryIds.map((categoryId) => database.prepare('INSERT INTO fulfillments (id, order_id, owner_category_id, status, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), orderId, categoryId, 'pending', createdAt)),
    ];
    await database.batch(statements);
    await recordAudit(user.id, 'payment.mock_confirmed', 'order', orderId, { payment: 'mock', status: 'paid' });
    return NextResponse.json({ returnUrl: `/?payment=success&order=${encodeURIComponent(orderId)}` });
  } catch (error) {
    return apiError(error);
  }
}
