import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { AppError, assertSameOrigin, db, requireUser, recordAudit } from '@/lib/server';

type RequestBody = { type?: 'return' | 'question' | 'restock' | 'cancel' | 'warranty'; orderId?: string; productId?: string; message?: string };

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const rows = await db().prepare('SELECT requests.id, requests.type, requests.status, requests.message, requests.response, requests.created_at, categories.name AS category_name FROM requests LEFT JOIN categories ON categories.id = requests.routed_category_id WHERE requests.customer_id = ? ORDER BY requests.created_at DESC').bind(user.id).all();
    return NextResponse.json({ requests: rows.results });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const body = await safeJson<RequestBody>(request);
    const message = body.message?.trim() ?? '';
    if (!body.type || !['return', 'question', 'restock', 'cancel', 'warranty'].includes(body.type) || message.length < 5 || message.length > 2000) throw new AppError(400, 'نوع یا متن درخواست معتبر نیست.');
    let routedCategoryId: string | null = null;
    if (body.orderId) {
      const owned = await db().prepare('SELECT id FROM orders WHERE id = ? AND customer_id = ?').bind(body.orderId, user.id).first();
      if (!owned) throw new AppError(404, 'سفارش پیدا نشد.');
      if (body.productId && !(await db().prepare('SELECT id FROM order_items WHERE order_id = ? AND product_id = ?').bind(body.orderId, body.productId).first())) throw new AppError(400, 'کالا در این سفارش نیست.');
    }
    if (['return', 'warranty', 'cancel'].includes(body.type) && !body.orderId) throw new AppError(400, 'برای این درخواست سفارش را انتخاب کنید.');
    if (body.productId) routedCategoryId = (await db().prepare('SELECT owner_category_id FROM products WHERE id = ?').bind(body.productId).first<{ owner_category_id: string }>())?.owner_category_id ?? null;
    if (body.type === 'cancel') routedCategoryId = null;
    const requestId = crypto.randomUUID(); const createdAt = new Date().toISOString();
    await db().prepare('INSERT INTO requests (id, type, customer_id, order_id, product_id, routed_category_id, status, message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(requestId, body.type, user.id, body.orderId ?? null, body.productId ?? null, routedCategoryId, 'open', message, createdAt, createdAt).run();
    await recordAudit(user.id, 'request.created', 'request', requestId, { type: body.type, routedCategoryId });
    return NextResponse.json({ id: requestId }, { status: 201 });
  } catch (error) { return apiError(error); }
}
