import { writeAudit } from '../audit/service';
import { ensureSeedData } from '../bootstrap/seed';
import { database, newId, timestamp } from '../core/database';
import { DomainError } from '../core/errors';
import { canManageCategory, categoryScope } from '../access/service';
import type { SessionUser } from '../identity/service';

export async function publicCatalog() {
  await ensureSeedData();
  const [categories, products] = await Promise.all([
    database().prepare('SELECT id,name,slug,requires_approval FROM categories WHERE is_archived=0 ORDER BY name').all(),
    database().prepare("SELECT products.id,products.owner_category_id AS category_id,products.title,products.description,products.price,products.stock,products.image_position,categories.name AS category_name,categories.slug AS category_slug FROM products JOIN categories ON categories.id=products.owner_category_id WHERE products.status='published' AND categories.is_archived=0 ORDER BY products.updated_at DESC").all(),
  ]);
  return { categories: categories.results, products: products.results };
}

export async function publicProduct(productId: string) {
  await ensureSeedData();
  const product = await database().prepare("SELECT products.id,products.title,products.description,products.price,products.stock,products.attributes,products.image_position,categories.name AS category_name,categories.slug AS category_slug FROM products JOIN categories ON categories.id=products.owner_category_id WHERE products.id=? AND products.status='published' AND categories.is_archived=0 LIMIT 1").bind(productId).first();
  if (!product) throw new DomainError(404, 'کالا پیدا نشد.');
  const variants = await database().prepare('SELECT id,sku,options,price,compare_at_price,stock FROM variants WHERE product_id=? ORDER BY sku').bind(productId).all();
  return { product, variants: variants.results };
}

export async function managementCatalog(user: SessionUser) {
  if (user.role === 'customer') throw new DomainError(403, 'به پنل مدیریت دسترسی ندارید.');
  const scope = await categoryScope(user);
  const ids = scope?.map((item) => item.id) ?? [];
  const where = scope ? `WHERE products.owner_category_id IN (${ids.map(() => '?').join(',')})` : '';
  const categoryWhere = scope ? `WHERE categories.id IN (${ids.map(() => '?').join(',')})` : 'WHERE categories.is_archived=0';
  const [products, categories] = await Promise.all([
    database().prepare(`SELECT products.id,products.title,products.price,products.stock,products.status,products.owner_category_id AS category_id,categories.name AS category_name FROM products JOIN categories ON categories.id=products.owner_category_id ${where} ORDER BY products.updated_at DESC`).bind(...ids).all(),
    database().prepare(`SELECT categories.id,categories.name,categories.slug,categories.requires_approval FROM categories ${categoryWhere} ORDER BY categories.name`).bind(...ids).all(),
  ]);
  return { products: products.results, categories: categories.results, scope: scope ?? 'all' };
}

export type CreateProduct = { categoryId?: string; title?: string; description?: string; price?: number; stock?: number };
export async function createProduct(user: SessionUser, input: CreateProduct) {
  const categoryId = input.categoryId ?? '';
  const title = input.title?.trim() ?? '';
  const description = input.description?.trim() ?? '';
  if (!(await canManageCategory(user, categoryId))) throw new DomainError(403, 'اجازهٔ مدیریت این دسته را ندارید.');
  if (title.length < 3 || title.length > 150 || description.length < 5 || description.length > 1000) throw new DomainError(400, 'نام یا توضیح کالا معتبر نیست.');
  if (!Number.isInteger(input.price) || input.price! < 1000 || input.price! > 2_000_000_000) throw new DomainError(400, 'قیمت معتبر نیست.');
  if (!Number.isInteger(input.stock) || input.stock! < 0 || input.stock! > 100000) throw new DomainError(400, 'موجودی معتبر نیست.');
  const category = await database().prepare('SELECT requires_approval FROM categories WHERE id=? AND is_archived=0').bind(categoryId).first<{ requires_approval: number }>();
  if (!category) throw new DomainError(404, 'دسته پیدا نشد.');
  const productId = newId();
  const status = category.requires_approval && user.role !== 'super_admin' ? 'pending' : 'published';
  await database().prepare('INSERT INTO products (id,owner_category_id,title,description,status,price,stock,image_position,attributes,created_by,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(productId, categoryId, title, description, status, input.price, input.stock, '50% 50%', '{}', user.id, timestamp()).run();
  await writeAudit(user.id, 'product.created', 'product', productId, { categoryId, status, price: input.price, stock: input.stock }, categoryId);
  return { id: productId, status };
}

export type UpdateProduct = { status?: 'draft' | 'pending' | 'published' | 'archived'; price?: number; stock?: number; attributes?: Record<string, string | number | boolean>; variants?: { sku: string; options: Record<string, string>; price: number; stock: number }[] };
export async function updateProduct(user: SessionUser, id: string, input: UpdateProduct) {
  const product = await database().prepare('SELECT owner_category_id,price FROM products WHERE id=?').bind(id).first<{ owner_category_id: string; price: number }>();
  if (!product || !(await canManageCategory(user, product.owner_category_id))) throw new DomainError(404, 'کالا پیدا نشد.');
  if (input.status && !['draft', 'pending', 'published', 'archived'].includes(input.status)) throw new DomainError(400, 'وضعیت کالا معتبر نیست.');
  if (input.price !== undefined && (!Number.isInteger(input.price) || input.price < 1000)) throw new DomainError(400, 'قیمت معتبر نیست.');
  if (input.stock !== undefined && (!Number.isInteger(input.stock) || input.stock < 0)) throw new DomainError(400, 'موجودی معتبر نیست.');
  if (input.status === 'published') {
    const category = await database().prepare('SELECT requires_approval FROM categories WHERE id=?').bind(product.owner_category_id).first<{ requires_approval: number }>();
    if (category?.requires_approval && user.role !== 'super_admin') throw new DomainError(403, 'انتشار این دسته نیازمند تأیید مدیر کل است.');
    if ((input.price ?? product.price) < 1000) throw new DomainError(400, 'کالای قابل انتشار باید قیمت داشته باشد.');
  }
  if (input.variants && (input.variants.length > 100 || input.variants.some((variant) => !/^[A-Za-z0-9_-]{3,64}$/.test(variant.sku) || !Number.isInteger(variant.price) || !Number.isInteger(variant.stock) || variant.price < 1000 || variant.stock < 0))) throw new DomainError(400, 'گونه‌های کالا معتبر نیستند.');
  await database().prepare('UPDATE products SET status=COALESCE(?,status),price=COALESCE(?,price),stock=COALESCE(?,stock),attributes=COALESCE(?,attributes),updated_at=? WHERE id=?').bind(input.status ?? null, input.price ?? null, input.stock ?? null, input.attributes ? JSON.stringify(input.attributes) : null, timestamp(), id).run();
  if (input.variants) {
    const statements: D1PreparedStatement[] = [database().prepare('DELETE FROM variants WHERE product_id=?').bind(id), ...input.variants.map((variant) => database().prepare('INSERT INTO variants (id,product_id,sku,options,price,stock,reserved) VALUES (?,?,?,?,?,?,0)').bind(newId(), id, variant.sku, JSON.stringify(variant.options), variant.price, variant.stock))];
    await database().batch(statements);
  }
  await writeAudit(user.id, 'product.updated', 'product', id, input, product.owner_category_id);
}
