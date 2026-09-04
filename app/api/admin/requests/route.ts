import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import {
  AppError,
  assertSameOrigin,
  canManageCategory,
  db,
  requireUser,
  recordAudit,
} from '@/lib/server';
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (user.role === 'customer') throw new AppError(403, 'دسترسی ندارید.');
    const rows = await db().prepare(`SELECT r.id,r.type,r.routed_category_id,r.status,r.message,r.response,r.created_at FROM requests r WHERE ? = 'super_admin' OR EXISTS (SELECT 1 FROM categories target JOIN assignments a ON a.user_id = ? JOIN categories scope ON scope.id = a.category_id WHERE target.id = r.routed_category_id AND (target.path = scope.path OR substr(target.path,1,length(scope.path)+1)=scope.path||'/')) ORDER BY r.created_at DESC LIMIT 200`).bind(user.role,user.id).all();
    return NextResponse.json({ requests: rows.results });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const body = await safeJson<{
      id: string;
      response: string;
      status: string;
    }>(request);
    if (
      !body.id ||
      !body.response ||
      body.response.length > 2000 ||
      !['in_progress', 'resolved', 'rejected'].includes(body.status)
    )
      throw new AppError(400, 'پاسخ معتبر نیست.');
    const item = await db()
      .prepare('SELECT routed_category_id FROM requests WHERE id=?')
      .bind(body.id)
      .first<{ routed_category_id: string | null }>();
    if (
      !item ||
      !(
        user.role === 'super_admin' ||
        (item.routed_category_id &&
          (await canManageCategory(user, item.routed_category_id)))
      )
    )
      throw new AppError(404, 'درخواست پیدا نشد.');
    await db()
      .prepare(
        'UPDATE requests SET response=?,status=?,assignee_id=?,updated_at=? WHERE id=?',
      )
      .bind(
        body.response,
        body.status,
        user.id,
        new Date().toISOString(),
        body.id,
      )
      .run();
    await recordAudit(user.id, 'request.responded', 'request', body.id, {
      status: body.status,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
