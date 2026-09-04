import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { db, ensureSeedData } from '@/lib/server';

export async function GET() {
  try {
    await ensureSeedData();
    const database = db();
    const [categories, products] = await Promise.all([
      database.prepare('SELECT id, name, slug, requires_approval FROM categories WHERE is_archived = 0 ORDER BY name').all(),
      database.prepare("SELECT products.id, products.owner_category_id AS category_id, products.title, products.description, products.price, products.stock, products.image_position, categories.name AS category_name, categories.slug AS category_slug FROM products JOIN categories ON categories.id = products.owner_category_id WHERE products.status = 'published' AND categories.is_archived = 0 ORDER BY products.updated_at DESC").all(),
    ]);
    return NextResponse.json({ categories: categories.results, products: products.results });
  } catch (error) {
    return apiError(error);
  }
}
