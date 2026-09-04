import { database } from '../core/database';
import { newId, timestamp } from '../core/database';
import { DomainError } from '../core/errors';
import { hashPassword } from '../core/security';
import { writeAudit } from '../audit/service';
import type { SessionUser } from '../identity/service';

export async function categoryScope(user: SessionUser) {
  if (user.role === 'super_admin') return null;
  const rows = await database().prepare("SELECT DISTINCT target.id,target.path FROM assignments JOIN categories root ON root.id=assignments.category_id JOIN categories target ON target.path=root.path OR substr(target.path,1,length(root.path)+1)=root.path||'/' WHERE assignments.user_id=? AND assignments.role='category_admin' AND target.is_archived=0").bind(user.id).all<{ id: string; path: string }>();
  return rows.results;
}

export async function canManageCategory(user: SessionUser, categoryId: string) {
  if (user.role === 'super_admin') return true;
  if (user.role !== 'category_admin') return false;
  const target = await database().prepare('SELECT path FROM categories WHERE id=?').bind(categoryId).first<{ path: string }>();
  const scope = await categoryScope(user);
  return Boolean(target && scope?.some((item) => target.path === item.path || target.path.startsWith(`${item.path}/`)));
}

function requireSuper(user: SessionUser) {
  if (user.role !== 'super_admin') throw new DomainError(403, 'فقط مدیر کل می‌تواند دسترسی‌ها را تغییر دهد.');
}

export async function accessOverview(user: SessionUser) {
  requireSuper(user);
  const [users, assignments] = await Promise.all([
    database().prepare("SELECT id,name,email,role,is_active FROM users WHERE role IN ('category_admin','super_admin') ORDER BY name").all(),
    database().prepare('SELECT assignments.id,assignments.user_id,users.name AS user_name,categories.id AS category_id,categories.name AS category_name,assignments.role FROM assignments JOIN users ON users.id=assignments.user_id JOIN categories ON categories.id=assignments.category_id ORDER BY users.name,categories.path').all(),
  ]);
  return { users: users.results, assignments: assignments.results };
}

export async function changeAccess(user: SessionUser, input: { action?: 'create_admin' | 'assign'; userId?: string; categoryId?: string; name?: string; email?: string; password?: string }) {
  requireSuper(user);
  if (input.action === 'create_admin') {
    const name = input.name?.trim() ?? ''; const email = input.email?.trim().toLowerCase() ?? ''; const password = input.password ?? '';
    if (name.length < 2 || name.length > 80 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 10) throw new DomainError(400, 'اطلاعات ادمین معتبر نیست.');
    const id = newId();
    await database().prepare("INSERT INTO users (id,email,name,password_hash,role,is_active,created_at) VALUES (?,?,?,?,'category_admin',1,?)").bind(id, email, name, await hashPassword(password), timestamp()).run();
    await writeAudit(user.id, 'admin.created', 'user', id, { email });
    return { id };
  }
  if (input.action === 'assign' && input.userId && input.categoryId) {
    const [target, category] = await Promise.all([
      database().prepare("SELECT id FROM users WHERE id=? AND role='category_admin' AND is_active=1").bind(input.userId).first(),
      database().prepare('SELECT id FROM categories WHERE id=? AND is_archived=0').bind(input.categoryId).first(),
    ]);
    if (!target || !category) throw new DomainError(404, 'ادمین یا دسته پیدا نشد.');
    await database().prepare("INSERT OR IGNORE INTO assignments (id,user_id,category_id,role,granted_by,granted_at) VALUES (?,?,?,'category_admin',?,?)").bind(newId(), input.userId, input.categoryId, user.id, timestamp()).run();
    await writeAudit(user.id, 'assignment.created', 'assignment', `${input.userId}:${input.categoryId}`, input);
    return { ok: true };
  }
  throw new DomainError(400, 'درخواست دسترسی معتبر نیست.');
}
