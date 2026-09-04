import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { AppError, assertSameOrigin, db, requireUser, recordAudit } from '@/lib/server';

type CartItem = { productId?: string; quantity?: number };
type OrderBody = { items?: CartItem[]; shippingAddress?: string };

type OrderRow = { id: string; status: string; payment_status: string; total: number; shipping_address: string; created_at: string; paid_at: string | null };

async function orderDetails(customerId: string, orderId?: string) {
  const database = db();
  const orders = orderId
    ? await database.prepare('SELECT id, status, payment_status, total, shipping_address, created_at, paid_at FROM orders WHERE customer_id = ? AND id = ?').bind(customerId, orderId).all<OrderRow>()
    : await database.prepare('SELECT id, status, payment_status, total, shipping_address, created_at, paid_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC').bind(customerId).all<OrderRow>();
  const result = [];
  for (const order of orders.results) {
    const [items, fulfillments] = await Promise.all([
      database.prepare('SELECT title, quantity, unit_price, owner_category_id FROM order_items WHERE order_id = ?').bind(order.id).all(),
      database.prepare('SELECT fulfillments.id, fulfillments.status, fulfillments.tracking_code, categories.name AS category_name FROM fulfillments JOIN categories ON categories.id = fulfillments.owner_category_id WHERE fulfillments.order_id = ?').bind(order.id).all(),
    ]);
    result.push({ ...order, items: items.results, fulfillments: fulfillments.results });
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ orders: await orderDetails(user.id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const body = await safeJson<OrderBody>(request);
    const address = body.shippingAddress?.trim() ?? '';
    const requested = body.items ?? [];
    if (address.length < 10 || address.length > 500) throw new AppError(400, 'نشانی ارسال باید بین ۱۰ تا ۵۰۰ کاراکتر باشد.');
    if (requested.length < 1 || requested.length > 20) throw new AppError(400, 'سبد خرید معتبر نیست.');
    const quantities = new Map<string, number>();
    for (const item of requested) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity! < 1 || item.quantity! > 10) throw new AppError(400, 'تعداد یکی از کالاها معتبر نیست.');
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity!);
    }
    const ids = [...quantities.keys()];
    const placeholders = ids.map(() => '?').join(',');
    const products = await db().prepare(`SELECT id, owner_category_id, title, price, stock FROM products WHERE status = 'published' AND id IN (${placeholders})`).bind(...ids).all<{ id: string; owner_category_id: string; title: string; price: number; stock: number }>();
    if (products.results.length !== ids.length) throw new AppError(400, 'یکی از کالاهای انتخابی دیگر قابل خرید نیست.');
    const lines = products.results.map((product) => ({ ...product, quantity: quantities.get(product.id) ?? 0 }));
    if (lines.some((line) => line.quantity > line.stock)) throw new AppError(409, 'موجودی یکی از کالاها کافی نیست.');
    const orderId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const statements: D1PreparedStatement[] = [
      db().prepare('INSERT INTO orders (id, customer_id, status, payment_status, total, shipping_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(orderId, user.id, 'pending_payment', 'pending', total, address, createdAt),
      ...lines.map((line) => db().prepare('INSERT INTO order_items (id, order_id, product_id, owner_category_id, title, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), orderId, line.id, line.owner_category_id, line.title, line.quantity, line.price)),
    ];
    await db().batch(statements);
    await recordAudit(user.id, 'order.created', 'order', orderId, { total, lineCount: lines.length });
    return NextResponse.json({ orderId, paymentUrl: `/payment/mock?order=${encodeURIComponent(orderId)}` }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export { orderDetails };
