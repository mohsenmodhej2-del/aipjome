import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  phone: text('phone'),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['customer', 'super_admin', 'category_admin'] }).notNull().default('customer'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
}, (table) => [uniqueIndex('users_email_unique').on(table.email), uniqueIndex('users_phone_unique').on(table.phone)]);

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  parentId: text('parent_id'),
  path: text('path').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  requiresApproval: integer('requires_approval', { mode: 'boolean' }).notNull().default(false),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
}, (table) => [uniqueIndex('categories_path_unique').on(table.path), uniqueIndex('categories_slug_unique').on(table.slug)]);

export const assignments = sqliteTable('assignments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  categoryId: text('category_id').notNull().references(() => categories.id),
  role: text('role', { enum: ['category_admin'] }).notNull(),
  grantedBy: text('granted_by').notNull(),
  grantedAt: text('granted_at').notNull(),
}, (table) => [
  uniqueIndex('assignments_user_category_role_unique').on(table.userId, table.categoryId, table.role),
  index('idx_assignments_user_id').on(table.userId),
]);

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  ownerCategoryId: text('owner_category_id').notNull().references(() => categories.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: ['draft', 'pending', 'published', 'archived'] }).notNull().default('draft'),
  price: integer('price').notNull(),
  stock: integer('stock').notNull().default(0),
  imagePosition: text('image_position').notNull().default('50% 50%'),
  attributes: text('attributes').notNull().default('{}'),
  createdBy: text('created_by').notNull().references(() => users.id),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_products_category_status').on(table.ownerCategoryId, table.status),
  index('idx_products_published').on(table.status),
]);

export const attributeSets = sqliteTable('attribute_sets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  fields: text('fields').notNull(),
  createdAt: text('created_at').notNull(),
});

export const productCategories = sqliteTable('product_categories', {
  productId: text('product_id').notNull().references(() => products.id),
  categoryId: text('category_id').notNull().references(() => categories.id),
}, (table) => [uniqueIndex('product_categories_unique').on(table.productId, table.categoryId), index('idx_product_categories_category').on(table.categoryId)]);

export const variants = sqliteTable('variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  sku: text('sku').notNull(),
  barcode: text('barcode'),
  options: text('options').notNull().default('{}'),
  price: integer('price').notNull(),
  compareAtPrice: integer('compare_at_price'),
  stock: integer('stock').notNull().default(0),
  reserved: integer('reserved').notNull().default(0),
}, (table) => [uniqueIndex('variants_sku_unique').on(table.sku), index('idx_variants_product').on(table.productId)]);

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => users.id),
  status: text('status', { enum: ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'] }).notNull().default('pending_payment'),
  paymentStatus: text('payment_status', { enum: ['pending', 'paid', 'failed', 'refunded'] }).notNull().default('pending'),
  total: integer('total').notNull(),
  shippingAddress: text('shipping_address').notNull(),
  createdAt: text('created_at').notNull(),
  paidAt: text('paid_at'),
}, (table) => [index('idx_orders_customer_created').on(table.customerId, table.createdAt), index('idx_orders_status').on(table.status)]);

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  productId: text('product_id').notNull().references(() => products.id),
  ownerCategoryId: text('owner_category_id').notNull().references(() => categories.id),
  title: text('title').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
}, (table) => [index('idx_order_items_order_id').on(table.orderId), index('idx_order_items_category').on(table.ownerCategoryId)]);

export const fulfillments = sqliteTable('fulfillments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  ownerCategoryId: text('owner_category_id').notNull().references(() => categories.id),
  status: text('status', { enum: ['pending', 'preparing', 'shipped', 'delivered', 'unavailable'] }).notNull().default('pending'),
  trackingCode: text('tracking_code'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_fulfillments_category_status').on(table.ownerCategoryId, table.status), index('idx_fulfillments_order_id').on(table.orderId)]);

export const requests = sqliteTable('requests', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['return', 'question', 'restock', 'cancel', 'warranty', 'brand_request'] }).notNull(),
  customerId: text('customer_id').references(() => users.id),
  orderId: text('order_id').references(() => orders.id),
  productId: text('product_id').references(() => products.id),
  routedCategoryId: text('routed_category_id').references(() => categories.id),
  status: text('status', { enum: ['open', 'in_progress', 'resolved', 'rejected'] }).notNull().default('open'),
  message: text('message').notNull(),
  response: text('response'),
  assigneeId: text('assignee_id').references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [index('idx_requests_category_status').on(table.routedCategoryId, table.status), index('idx_requests_customer').on(table.customerId)]);

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  number: text('number').notNull(),
  snapshot: text('snapshot').notNull(),
  issuedAt: text('issued_at').notNull(),
}, (table) => [uniqueIndex('invoices_order_unique').on(table.orderId), uniqueIndex('invoices_number_unique').on(table.number)]);

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [uniqueIndex('sessions_token_hash_unique').on(table.tokenHash), index('idx_sessions_user_id').on(table.userId)]);

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  before: text('before'),
  after: text('after'),
  scopeUsed: text('scope_used'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_audit_entity').on(table.entity, table.entityId), index('idx_audit_actor').on(table.actorId)]);

export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  resetAt: text('reset_at').notNull(),
});
