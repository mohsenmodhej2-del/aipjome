import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { AppError, assertSameOrigin, db, passwordHash, requireUser, recordAudit } from '@/lib/server';

type AccessBody = { action?: 'create_admin' | 'assign'; userId?: string; categoryId?: string; name?: string; email?: string; password?: string };
function superOnly(role: string) { if (role !== 'super_admin') throw new AppError(403, 'فقط مدیر کل می‌تواند دسترسی‌ها را تغییر دهد.'); }

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request); superOnly(user.role);
    const [users, assignments] = await Promise.all([
      db().prepare("SELECT id, name, email, role, is_active FROM users WHERE role IN ('category_admin', 'super_admin') ORDER BY name").all(),
      db().prepare('SELECT assignments.id, assignments.user_id, users.name AS user_name, categories.id AS category_id, categories.name AS category_name, assignments.role FROM assignments JOIN users ON users.id = assignments.user_id JOIN categories ON categories.id = assignments.category_id ORDER BY users.name, categories.path').all(),
    ]);
    return NextResponse.json({ users: users.results, assignments: assignments.results });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request); const actor = await requireUser(request); superOnly(actor.role); const body = await safeJson<AccessBody>(request);
    if (body.action === 'create_admin') {
      const name = body.name?.trim() ?? ''; const email = body.email?.trim().toLowerCase() ?? ''; const password = body.password ?? '';
      if (name.length < 2 || name.length > 80 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 10) throw new AppError(400, 'اطلاعات ادمین معتبر نیست.');
      const userId = crypto.randomUUID();
      await db().prepare("INSERT INTO users (id, email, name, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, 'category_admin', 1, ?)").bind(userId, email, name, await passwordHash(password), new Date().toISOString()).run();
      await recordAudit(actor.id, 'admin.created', 'user', userId, { email });
      return NextResponse.json({ id: userId }, { status: 201 });
    }
    if (body.action === 'assign' && body.userId && body.categoryId) {
      const target = await db().prepare("SELECT id FROM users WHERE id = ? AND role = 'category_admin' AND is_active = 1").bind(body.userId).first();
      const category = await db().prepare('SELECT id FROM categories WHERE id = ? AND is_archived = 0').bind(body.categoryId).first();
      if (!target || !category) throw new AppError(404, 'ادمین یا دسته پیدا نشد.');
      await db().prepare("INSERT OR IGNORE INTO assignments (id, user_id, category_id, role, granted_by, granted_at) VALUES (?, ?, ?, 'category_admin', ?, ?)").bind(crypto.randomUUID(), body.userId, body.categoryId, actor.id, new Date().toISOString()).run();
      await recordAudit(actor.id, 'assignment.created', 'assignment', `${body.userId}:${body.categoryId}`, body);
      return NextResponse.json({ ok: true });
    }
    throw new AppError(400, 'درخواست دسترسی معتبر نیست.');
  } catch (error) { return apiError(error); }
}
