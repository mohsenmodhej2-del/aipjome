import { canManageCategory } from '../access/service';
import { writeAudit } from '../audit/service';
import { database, newId, timestamp } from '../core/database';
import { DomainError } from '../core/errors';
import type { SessionUser } from '../identity/service';

export type SupportInput = { type?: 'return' | 'question' | 'restock' | 'cancel' | 'warranty'; orderId?: string; productId?: string; message?: string };

export async function customerRequests(customerId: string) {
  const rows = await database().prepare('SELECT requests.id,requests.type,requests.status,requests.message,requests.response,requests.created_at,categories.name AS category_name FROM requests LEFT JOIN categories ON categories.id=requests.routed_category_id WHERE requests.customer_id=? ORDER BY requests.created_at DESC').bind(customerId).all();
  return rows.results;
}

export async function createRequest(customerId: string, input: SupportInput) {
  const message = input.message?.trim() ?? '';
  if (!input.type || !['return', 'question', 'restock', 'cancel', 'warranty'].includes(input.type) || message.length < 5 || message.length > 2000) throw new DomainError(400, 'نوع یا متن درخواست معتبر نیست.');
  let routedCategoryId: string | null = null;
  if (input.orderId) {
    if (!(await database().prepare('SELECT id FROM orders WHERE id=? AND customer_id=?').bind(input.orderId, customerId).first())) throw new DomainError(404, 'سفارش پیدا نشد.');
    if (input.productId && !(await database().prepare('SELECT id FROM order_items WHERE order_id=? AND product_id=?').bind(input.orderId, input.productId).first())) throw new DomainError(400, 'کالا در این سفارش نیست.');
  }
  if (['return', 'warranty', 'cancel'].includes(input.type) && !input.orderId) throw new DomainError(400, 'برای این درخواست سفارش را انتخاب کنید.');
  if (input.productId) routedCategoryId = (await database().prepare('SELECT owner_category_id FROM products WHERE id=?').bind(input.productId).first<{ owner_category_id: string }>())?.owner_category_id ?? null;
  const id = newId();
  const createdAt = timestamp();
  await database().prepare("INSERT INTO requests (id,type,customer_id,order_id,product_id,routed_category_id,status,message,created_at,updated_at) VALUES (?,?,?,?,?,?,'open',?,?,?)").bind(id, input.type, customerId, input.orderId ?? null, input.productId ?? null, input.type === 'cancel' ? null : routedCategoryId, message, createdAt, createdAt).run();
  await writeAudit(customerId, 'request.created', 'request', id, { type: input.type, routedCategoryId });
  return { id };
}

export async function managementRequests(user: SessionUser) {
  if (user.role === 'customer') throw new DomainError(403, 'دسترسی ندارید.');
  const rows = await database().prepare(`SELECT r.id,r.type,r.routed_category_id,r.status,r.message,r.response,r.created_at FROM requests r WHERE ?='super_admin' OR EXISTS (SELECT 1 FROM categories target JOIN assignments a ON a.user_id=? JOIN categories scope ON scope.id=a.category_id WHERE target.id=r.routed_category_id AND (target.path=scope.path OR substr(target.path,1,length(scope.path)+1)=scope.path||'/')) ORDER BY r.created_at DESC LIMIT 200`).bind(user.role, user.id).all();
  return rows.results;
}

export async function respondToRequest(user: SessionUser, input: { id?: string; response?: string; status?: string }) {
  const response = input.response?.trim() ?? '';
  if (!input.id || !response || response.length > 2000 || !input.status || !['in_progress', 'resolved', 'rejected'].includes(input.status)) throw new DomainError(400, 'پاسخ معتبر نیست.');
  const item = await database().prepare('SELECT routed_category_id FROM requests WHERE id=?').bind(input.id).first<{ routed_category_id: string | null }>();
  if (!item || !(user.role === 'super_admin' || (item.routed_category_id && (await canManageCategory(user, item.routed_category_id))))) throw new DomainError(404, 'درخواست پیدا نشد.');
  await database().prepare('UPDATE requests SET response=?,status=?,assignee_id=?,updated_at=? WHERE id=?').bind(response, input.status, user.id, timestamp(), input.id).run();
  await writeAudit(user.id, 'request.responded', 'request', input.id, { status: input.status });
}
