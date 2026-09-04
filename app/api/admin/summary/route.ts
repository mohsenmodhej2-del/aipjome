import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { AppError, categoryScope, db, requireUser } from '@/lib/server';

function requireManager(role: string) {
  if (role !== 'super_admin' && role !== 'category_admin') throw new AppError(403, 'به پنل مدیریت دسترسی ندارید.');
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    requireManager(user.role);
    const database = db();
    const scope = await categoryScope(user);
    const categoryIds = scope?.map((item) => item.id) ?? [];
    const condition = scope ? `WHERE products.owner_category_id IN (${categoryIds.map(() => '?').join(',')})` : '';
    const fulfillmentCondition = scope ? `AND fulfillments.owner_category_id IN (${categoryIds.map(() => '?').join(',')})` : '';
    const categoryCondition = scope ? `WHERE categories.id IN (${categoryIds.map(() => '?').join(',')})` : 'WHERE categories.is_archived = 0';
    const [products, fulfillmentRows, categoryRows, assignments] = await Promise.all([
      database.prepare(`SELECT products.id, products.title, products.price, products.stock, products.status, products.owner_category_id AS category_id, categories.name AS category_name FROM products JOIN categories ON categories.id = products.owner_category_id ${condition} ORDER BY products.updated_at DESC`).bind(...categoryIds).all(),
      database.prepare(`SELECT fulfillments.id, fulfillments.status, fulfillments.tracking_code, fulfillments.order_id, fulfillments.owner_category_id AS category_id, categories.name AS category_name FROM fulfillments JOIN categories ON categories.id = fulfillments.owner_category_id JOIN orders ON orders.id = fulfillments.order_id WHERE 1 = 1 ${fulfillmentCondition} ORDER BY fulfillments.created_at DESC`).bind(...categoryIds).all(),
      database.prepare(`SELECT categories.id, categories.name, categories.slug, categories.requires_approval FROM categories ${categoryCondition} ORDER BY categories.name`).bind(...categoryIds).all(),
      user.role === 'super_admin' ? database.prepare('SELECT assignments.user_id, users.name AS user_name, users.email, categories.name AS category_name FROM assignments JOIN users ON users.id = assignments.user_id JOIN categories ON categories.id = assignments.category_id ORDER BY users.name').all() : Promise.resolve({ results: [] }),
    ]);
    return NextResponse.json({ products: products.results, fulfillments: fulfillmentRows.results, categories: categoryRows.results, assignments: assignments.results, scope: scope ?? 'all' });
  } catch (error) {
    return apiError(error);
  }
}
