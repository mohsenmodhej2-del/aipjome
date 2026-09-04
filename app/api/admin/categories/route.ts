import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { AppError, assertSameOrigin, db, requireUser, recordAudit } from '@/lib/server';

type CategoryBody = { name?: string; slug?: string; parentId?: string | null; requiresApproval?: boolean; archiveId?: string };
function superOnly(role: string) { if (role !== 'super_admin') throw new AppError(403, 'فقط مدیر کل می‌تواند دسته‌ها را تغییر دهد.'); }

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request); const user = await requireUser(request); superOnly(user.role); const body = await safeJson<CategoryBody>(request);
    if (body.archiveId) {
      const active = await db().prepare("SELECT id FROM products WHERE owner_category_id = ? AND status IN ('draft', 'pending', 'published') LIMIT 1").bind(body.archiveId).first();
      if (active) throw new AppError(409, 'دسته‌ای که کالای فعال دارد بایگانی نمی‌شود.');
      await db().prepare('UPDATE categories SET is_archived = 1 WHERE id = ?').bind(body.archiveId).run();
      await recordAudit(user.id, 'category.archived', 'category', body.archiveId, {});
      return NextResponse.json({ ok: true });
    }
    const name = body.name?.trim() ?? ''; const slug = body.slug?.trim().toLowerCase() ?? '';
    if (name.length < 2 || name.length > 80 || !/^[a-z0-9-]{2,60}$/.test(slug)) throw new AppError(400, 'نام یا نشانی دسته معتبر نیست.');
    const parent = body.parentId ? await db().prepare('SELECT path FROM categories WHERE id = ? AND is_archived = 0').bind(body.parentId).first<{ path: string }>() : null;
    if (body.parentId && !parent) throw new AppError(404, 'دستهٔ والد پیدا نشد.');
    const categoryId = crypto.randomUUID(); const path = `${parent?.path ?? ''}/${slug}`;
    await db().prepare('INSERT INTO categories (id, parent_id, path, name, slug, requires_approval, is_archived) VALUES (?, ?, ?, ?, ?, ?, 0)').bind(categoryId, body.parentId ?? null, path, name, slug, body.requiresApproval ? 1 : 0).run();
    await recordAudit(user.id, 'category.created', 'category', categoryId, { name, path });
    return NextResponse.json({ id: categoryId }, { status: 201 });
  } catch (error) { return apiError(error); }
}
