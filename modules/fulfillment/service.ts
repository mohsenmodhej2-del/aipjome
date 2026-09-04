import { canManageCategory, categoryScope } from '../access/service';
import { writeAudit } from '../audit/service';
import { database } from '../core/database';
import { DomainError } from '../core/errors';
import type { SessionUser } from '../identity/service';

export async function fulfillmentQueue(user: SessionUser) {
  if (user.role === 'customer') throw new DomainError(403, 'به پنل مدیریت دسترسی ندارید.');
  const scope = await categoryScope(user); const ids = scope?.map((item) => item.id) ?? [];
  const filter = scope ? `AND fulfillments.owner_category_id IN (${ids.map(() => '?').join(',')})` : '';
  const rows = await database().prepare(`SELECT fulfillments.id,fulfillments.status,fulfillments.tracking_code,fulfillments.order_id,fulfillments.owner_category_id AS category_id,categories.name AS category_name FROM fulfillments JOIN categories ON categories.id=fulfillments.owner_category_id JOIN orders ON orders.id=fulfillments.order_id WHERE 1=1 ${filter} ORDER BY fulfillments.created_at DESC`).bind(...ids).all();
  return rows.results;
}

export async function updateFulfillment(user: SessionUser, input: { id?: string; status?: string; trackingCode?: string }) {
  const allowed = new Set(['pending', 'preparing', 'shipped', 'delivered', 'unavailable']);
  if (!input.id || !input.status || !allowed.has(input.status)) throw new DomainError(400, 'وضعیت ارسال معتبر نیست.');
  const item = await database().prepare('SELECT owner_category_id FROM fulfillments WHERE id=?').bind(input.id).first<{ owner_category_id: string }>();
  if (!item) throw new DomainError(404, 'بخش ارسال پیدا نشد.');
  if (!(await canManageCategory(user, item.owner_category_id))) throw new DomainError(403, 'اجازهٔ مدیریت این سفارش را ندارید.');
  const tracking = input.trackingCode?.trim() || null;
  if (tracking && tracking.length > 100) throw new DomainError(400, 'کد رهگیری بیش از حد طولانی است.');
  await database().prepare('UPDATE fulfillments SET status=?,tracking_code=? WHERE id=?').bind(input.status, tracking, input.id).run();
  await writeAudit(user.id, 'fulfillment.updated', 'fulfillment', input.id, { status: input.status, tracking }, item.owner_category_id);
}
