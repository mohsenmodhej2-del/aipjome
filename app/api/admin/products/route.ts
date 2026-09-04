import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { AppError, assertSameOrigin, canManageCategory, db, requireUser, recordAudit } from '@/lib/server';

type ProductBody = { categoryId?: string; title?: string; description?: string; price?: number; stock?: number };

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const body = await safeJson<ProductBody>(request);
    const categoryId = body.categoryId ?? '';
    const title = body.title?.trim() ?? '';
    const description = body.description?.trim() ?? '';
    if (!(await canManageCategory(user, categoryId))) throw new AppError(403, 'اجازهٔ مدیریت این دسته را ندارید.');
    if (title.length < 3 || title.length > 150 || description.length < 5 || description.length > 1000) throw new AppError(400, 'نام یا توضیح کالا معتبر نیست.');
    if (!Number.isInteger(body.price) || body.price! < 1000 || body.price! > 2_000_000_000) throw new AppError(400, 'قیمت معتبر نیست.');
    if (!Number.isInteger(body.stock) || body.stock! < 0 || body.stock! > 100000) throw new AppError(400, 'موجودی معتبر نیست.');
    const category = await db().prepare('SELECT requires_approval FROM categories WHERE id = ? AND is_archived = 0').bind(categoryId).first<{ requires_approval: number }>();
    if (!category) throw new AppError(404, 'دسته پیدا نشد.');
    const productId = crypto.randomUUID();
    const status = category.requires_approval && user.role !== 'super_admin' ? 'pending' : 'published';
    await db().prepare('INSERT INTO products (id, owner_category_id, title, description, status, price, stock, image_position, attributes, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(productId, categoryId, title, description, status, body.price, body.stock, '50% 50%', '{}', user.id, new Date().toISOString()).run();
    await recordAudit(user.id, 'product.created', 'product', productId, { categoryId, status, price: body.price, stock: body.stock }, categoryId);
    return NextResponse.json({ id: productId, status }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
