import { database, newId, timestamp } from '../core/database';
import { hashPassword } from '../core/security';

export async function ensureSeedData() {
  const db = database();
  if (await db.prepare('SELECT id FROM users LIMIT 1').first()) return;
  const createdAt = timestamp();
  const adminId = newId();
  const categoryAdminId = newId();
  const customerId = newId();
  const [adminHash, categoryAdminHash, customerHash] = await Promise.all([
    hashPassword('Admin123!'),
    hashPassword('Category123!'),
    hashPassword('Customer123!'),
  ]);
  const statements: D1PreparedStatement[] = [
    db.prepare('INSERT INTO users (id,email,name,password_hash,role,is_active,created_at) VALUES (?,?,?,?,?,1,?)').bind(adminId, 'admin@hamechi.test', 'مدیر همه‌چی', adminHash, 'super_admin', createdAt),
    db.prepare('INSERT INTO users (id,email,name,password_hash,role,is_active,created_at) VALUES (?,?,?,?,?,1,?)').bind(categoryAdminId, 'category@hamechi.test', 'ادمین پوشاک و سلامت', categoryAdminHash, 'category_admin', createdAt),
    db.prepare('INSERT INTO users (id,email,name,password_hash,role,is_active,created_at) VALUES (?,?,?,?,?,1,?)').bind(customerId, 'customer@hamechi.test', 'مشتری نمونه', customerHash, 'customer', createdAt),
  ];
  for (const row of [
    ['electronics', '/electronics', 'الکترونیک', 'electronics', 0],
    ['clothing', '/clothing', 'پوشاک', 'clothing', 0],
    ['beauty', '/beauty', 'آرایشی', 'beauty', 0],
    ['health', '/health', 'سلامت و مکمل', 'health', 1],
  ] as const) statements.push(db.prepare('INSERT INTO categories (id,path,name,slug,requires_approval,is_archived) VALUES (?,?,?,?,?,0)').bind(...row));
  statements.push(
    db.prepare("INSERT INTO assignments (id,user_id,category_id,role,granted_by,granted_at) VALUES (?,?,?,'category_admin',?,?)").bind(newId(), categoryAdminId, 'clothing', adminId, createdAt),
    db.prepare("INSERT INTO assignments (id,user_id,category_id,role,granted_by,granted_at) VALUES (?,?,?,'category_admin',?,?)").bind(newId(), categoryAdminId, 'health', adminId, createdAt),
  );
  for (const row of [
    ['p-headphones', 'electronics', 'هدفون بی‌سیم استودیو', 'صدای دقیق، اتصال پایدار و طراحی سبک برای استفادهٔ روزانه.', 4890000, 12, '8% 72%'],
    ['p-knit', 'clothing', 'بافت یقه‌دار آجری', 'بافت نرم با تن‌خور آزاد؛ موجود در سایزهای M و L.', 1240000, 18, '39% 67%'],
    ['p-serum', 'beauty', 'سرم آبرسان روزانه', 'فرمول سبک برای روتین مراقبت روزانهٔ پوست.', 690000, 24, '63% 74%'],
    ['p-vitamin', 'health', 'مکمل ویتامین روزانه', 'اطلاعات و هشدارهای مصرف را پیش از خرید مطالعه کنید.', 385000, 30, '74% 75%'],
  ] as const) statements.push(db.prepare("INSERT INTO products (id,owner_category_id,title,description,status,price,stock,image_position,attributes,created_by,updated_at) VALUES (?,?,?,?,'published',?,?,?,?,?,?)").bind(row[0], row[1], row[2], row[3], row[4], row[5], row[6], '{}', adminId, createdAt));
  await db.batch(statements);
}
