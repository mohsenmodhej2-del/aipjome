import { writeAudit } from '../audit/service';
import { database, newId, timestamp } from '../core/database';
import { DomainError } from '../core/errors';

type CartItem = { productId?: string; quantity?: number };
export type PlaceOrderInput = { items?: CartItem[]; shippingAddress?: string };
type OrderRow = { id: string; status: string; payment_status: string; total: number; shipping_address: string; created_at: string; paid_at: string | null };

export async function customerOrders(customerId: string, orderId?: string) {
  const orders = orderId
    ? await database().prepare('SELECT id,status,payment_status,total,shipping_address,created_at,paid_at FROM orders WHERE customer_id=? AND id=?').bind(customerId, orderId).all<OrderRow>()
    : await database().prepare('SELECT id,status,payment_status,total,shipping_address,created_at,paid_at FROM orders WHERE customer_id=? ORDER BY created_at DESC').bind(customerId).all<OrderRow>();
  const result = [];
  for (const order of orders.results) {
    const [items, fulfillments] = await Promise.all([
      database().prepare('SELECT title,quantity,unit_price,owner_category_id FROM order_items WHERE order_id=?').bind(order.id).all(),
      database().prepare('SELECT fulfillments.id,fulfillments.status,fulfillments.tracking_code,categories.name AS category_name FROM fulfillments JOIN categories ON categories.id=fulfillments.owner_category_id WHERE fulfillments.order_id=?').bind(order.id).all(),
    ]);
    result.push({ ...order, items: items.results, fulfillments: fulfillments.results });
  }
  return result;
}

export async function placeOrder(customerId: string, input: PlaceOrderInput) {
  const address = input.shippingAddress?.trim() ?? '';
  const requested = input.items ?? [];
  if (address.length < 10 || address.length > 500) throw new DomainError(400, 'نشانی ارسال باید بین ۱۰ تا ۵۰۰ کاراکتر باشد.');
  if (requested.length < 1 || requested.length > 20) throw new DomainError(400, 'سبد خرید معتبر نیست.');
  const quantities = new Map<string, number>();
  for (const item of requested) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity! < 1 || item.quantity! > 10) throw new DomainError(400, 'تعداد یکی از کالاها معتبر نیست.');
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity!);
  }
  const ids = [...quantities.keys()];
  const rows = await database().prepare(`SELECT id,owner_category_id,title,price,stock FROM products WHERE status='published' AND id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all<{ id: string; owner_category_id: string; title: string; price: number; stock: number }>();
  if (rows.results.length !== ids.length) throw new DomainError(400, 'یکی از کالاهای انتخابی دیگر قابل خرید نیست.');
  const lines = rows.results.map((product) => ({ ...product, quantity: quantities.get(product.id) ?? 0 }));
  if (lines.some((line) => line.quantity > line.stock)) throw new DomainError(409, 'موجودی یکی از کالاها کافی نیست.');
  const orderId = newId();
  const createdAt = timestamp();
  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  await database().batch([
    database().prepare('INSERT INTO orders (id,customer_id,status,payment_status,total,shipping_address,created_at) VALUES (?,?,?,?,?,?,?)').bind(orderId, customerId, 'pending_payment', 'pending', total, address, createdAt),
    ...lines.map((line) => database().prepare('INSERT INTO order_items (id,order_id,product_id,owner_category_id,title,quantity,unit_price) VALUES (?,?,?,?,?,?,?)').bind(newId(), orderId, line.id, line.owner_category_id, line.title, line.quantity, line.price)),
  ]);
  await writeAudit(customerId, 'order.created', 'order', orderId, { total, lineCount: lines.length });
  return { orderId, paymentUrl: `/payment/mock?order=${encodeURIComponent(orderId)}` };
}

export async function allOrders() {
  const rows = await database().prepare('SELECT orders.id,orders.status,orders.payment_status,orders.total,orders.shipping_address,orders.created_at,orders.paid_at,users.name AS customer_name,users.email AS customer_email FROM orders JOIN users ON users.id=orders.customer_id ORDER BY orders.created_at DESC LIMIT 200').all();
  return rows.results;
}
