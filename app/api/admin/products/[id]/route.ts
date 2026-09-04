import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { AppError, assertSameOrigin, canManageCategory, db, requireUser, recordAudit } from '@/lib/server';

type UpdateBody = { status?: 'draft' | 'pending' | 'published' | 'archived'; price?: number; stock?: number; attributes?: Record<string, string | number | boolean>; variants?: { sku: string; options: Record<string, string>; price: number; stock: number }[] };
const statuses = new Set(['draft', 'pending', 'published', 'archived']);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request); const user = await requireUser(request); const { id } = await context.params; const body = await safeJson<UpdateBody>(request);
    const product = await db().prepare('SELECT owner_category_id FROM products WHERE id = ?').bind(id).first<{ owner_category_id: string }>();
    if (!product) throw new AppError(404, 'کالا پیدا نشد.');
    if (!(await canManageCategory(user, product.owner_category_id))) throw new AppError(404, 'کالا پیدا نشد.');
    if (body.status && !statuses.has(body.status)) throw new AppError(400, 'وضعیت کالا معتبر نیست.');
    if (body.price !== undefined && (!Number.isInteger(body.price) || body.price < 1000)) throw new AppError(400, 'قیمت معتبر نیست.');
    if (body.stock !== undefined && (!Number.isInteger(body.stock) || body.stock < 0)) throw new AppError(400, 'موجودی معتبر نیست.');
    if (body.status === 'published') {
      const category = await db().prepare('SELECT requires_approval FROM categories WHERE id = ?').bind(product.owner_category_id).first<{requires_approval:number}>();
      if (category?.requires_approval && user.role !== 'super_admin') throw new AppError(403, 'انتشار این دسته نیازمند تأیید مدیر کل است.');
      const current = await db().prepare('SELECT price, stock FROM products WHERE id = ?').bind(id).first<{ price: number; stock: number }>();
      if ((body.price ?? current?.price ?? 0) < 1000) throw new AppError(400, 'کالای قابل انتشار باید قیمت داشته باشد.');
    }
    if (body.variants && (body.variants.length > 100 || body.variants.some((variant) => !/^[A-Za-z0-9_-]{3,64}$/.test(variant.sku) || !Number.isInteger(variant.price) || !Number.isInteger(variant.stock) || variant.price < 1000 || variant.stock < 0))) throw new AppError(400, 'گونه‌های کالا معتبر نیستند.');
    await db().prepare('UPDATE products SET status = COALESCE(?, status), price = COALESCE(?, price), stock = COALESCE(?, stock), attributes = COALESCE(?, attributes), updated_at = ? WHERE id = ?').bind(body.status ?? null, body.price ?? null, body.stock ?? null, body.attributes ? JSON.stringify(body.attributes) : null, new Date().toISOString(), id).run();
    if (body.variants) {
      if (body.variants.length > 100 || body.variants.some((variant) => !/^[A-Za-z0-9_-]{3,64}$/.test(variant.sku) || !Number.isInteger(variant.price) || !Number.isInteger(variant.stock) || variant.price < 1000 || variant.stock < 0)) throw new AppError(400, 'گونه‌های کالا معتبر نیستند.');
      const statements: D1PreparedStatement[] = [db().prepare('DELETE FROM variants WHERE product_id = ?').bind(id), ...body.variants.map((variant) => db().prepare('INSERT INTO variants (id, product_id, sku, options, price, stock, reserved) VALUES (?, ?, ?, ?, ?, ?, 0)').bind(crypto.randomUUID(), id, variant.sku, JSON.stringify(variant.options), variant.price, variant.stock))];
      await db().batch(statements);
    }
    await recordAudit(user.id, 'product.updated', 'product', id, body, product.owner_category_id);
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
