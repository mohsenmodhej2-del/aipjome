import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { AppError, assertSameOrigin, canManageCategory, db, requireUser, recordAudit } from '@/lib/server';

type FulfillmentBody = { id?: string; status?: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'unavailable'; trackingCode?: string };
const allowed = new Set(['pending', 'preparing', 'shipped', 'delivered', 'unavailable']);

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const body = await safeJson<FulfillmentBody>(request);
    if (!body.id || !body.status || !allowed.has(body.status)) throw new AppError(400, 'وضعیت ارسال معتبر نیست.');
    const fulfillment = await db().prepare('SELECT owner_category_id FROM fulfillments WHERE id = ?').bind(body.id).first<{ owner_category_id: string }>();
    if (!fulfillment) throw new AppError(404, 'بخش ارسال پیدا نشد.');
    if (!(await canManageCategory(user, fulfillment.owner_category_id))) throw new AppError(403, 'اجازهٔ مدیریت این سفارش را ندارید.');
    const tracking = body.trackingCode?.trim() || null;
    if (tracking && tracking.length > 100) throw new AppError(400, 'کد رهگیری بیش از حد طولانی است.');
    await db().prepare('UPDATE fulfillments SET status = ?, tracking_code = ? WHERE id = ?').bind(body.status, tracking, body.id).run();
    await recordAudit(user.id, 'fulfillment.updated', 'fulfillment', body.id, { status: body.status, tracking }, fulfillment.owner_category_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
