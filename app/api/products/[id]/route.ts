import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { AppError, db, ensureSeedData } from '@/lib/server';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeedData();
    const { id } = await context.params;
    const product = await db().prepare("SELECT products.id, products.title, products.description, products.price, products.stock, products.attributes, products.image_position, categories.name AS category_name, categories.slug AS category_slug FROM products JOIN categories ON categories.id = products.owner_category_id WHERE products.id = ? AND products.status = 'published' AND categories.is_archived = 0 LIMIT 1").bind(id).first();
    if (!product) throw new AppError(404, 'کالا پیدا نشد.');
    const variants = await db().prepare('SELECT id, sku, options, price, compare_at_price, stock FROM variants WHERE product_id = ? ORDER BY sku').bind(id).all();
    return NextResponse.json({ product, variants: variants.results });
  } catch (error) { return apiError(error); }
}
