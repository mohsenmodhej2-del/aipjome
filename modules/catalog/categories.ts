import { writeAudit } from '../audit/service';
import { database, newId } from '../core/database';
import { DomainError } from '../core/errors';
import type { SessionUser } from '../identity/service';

export async function changeCategory(user: SessionUser, input: { name?: string; slug?: string; parentId?: string | null; requiresApproval?: boolean; archiveId?: string }) {
  if (user.role !== 'super_admin') throw new DomainError(403, 'فقط مدیر کل می‌تواند دسته‌ها را تغییر دهد.');
  if (input.archiveId) {
    if (await database().prepare("SELECT id FROM products WHERE owner_category_id=? AND status IN ('draft','pending','published') LIMIT 1").bind(input.archiveId).first()) throw new DomainError(409, 'دسته‌ای که کالای فعال دارد بایگانی نمی‌شود.');
    await database().prepare('UPDATE categories SET is_archived=1 WHERE id=?').bind(input.archiveId).run();
    await writeAudit(user.id, 'category.archived', 'category', input.archiveId, {});
    return { ok: true };
  }
  const name = input.name?.trim() ?? ''; const slug = input.slug?.trim().toLowerCase() ?? '';
  if (name.length < 2 || name.length > 80 || !/^[a-z0-9-]{2,60}$/.test(slug)) throw new DomainError(400, 'نام یا نشانی دسته معتبر نیست.');
  const parent = input.parentId ? await database().prepare('SELECT path FROM categories WHERE id=? AND is_archived=0').bind(input.parentId).first<{ path: string }>() : null;
  if (input.parentId && !parent) throw new DomainError(404, 'دستهٔ والد پیدا نشد.');
  const id = newId(); const path = `${parent?.path ?? ''}/${slug}`;
  await database().prepare('INSERT INTO categories (id,parent_id,path,name,slug,requires_approval,is_archived) VALUES (?,?,?,?,?,?,0)').bind(id, input.parentId ?? null, path, name, slug, input.requiresApproval ? 1 : 0).run();
  await writeAudit(user.id, 'category.created', 'category', id, { name, path });
  return { id };
}
