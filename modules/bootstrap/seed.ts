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
    ['tools', '/tools', 'ابزارآلات', 'tools', 0],
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
    ['p-shirt-men', 'clothing', 'تی‌شرت مردانه کتان', 'تی‌شرت کتان خنک و راحت برای استفاده روزمره.', 390000, 25, '50% 50%'],
    ['p-shirt-women', 'clothing', 'تی‌شرت زنانه اورسایز', 'تی‌شرت زنانه با برش آزاد و رنگ‌بندی متنوع.', 520000, 20, '50% 50%'],
    ['p-trousers-men', 'clothing', 'شلوار جین مردانه', 'شلوار جین راسته با دوخت مقاوم و تن‌خور کلاسیک.', 1280000, 14, '50% 50%'],
    ['p-trousers-women', 'clothing', 'شلوار پارچه‌ای زنانه', 'شلوار پارچه‌ای خوش‌دوخت مناسب استایل اداری و روزانه.', 980000, 18, '50% 50%'],
    ['p-dress-women', 'clothing', 'پیراهن زنانه تابستانی', 'پیراهن سبک و رنگی برای روزهای گرم سال.', 1650000, 11, '50% 50%'],
    ['p-belt-men', 'clothing', 'کمربند چرم مردانه', 'کمربند چرم طبیعی با سگک فلزی مات.', 740000, 16, '50% 50%'],
    ['p-shoes-unisex', 'clothing', 'کتانی روزمره اسپرت', 'کتانی سبک و راحت برای استفاده روزمره، مناسب زنانه و مردانه.', 2350000, 9, '50% 50%'],
    ['p-perfume-unisex', 'beauty', 'عطر روزانه چوبی', 'رایحه چوبی و مرکباتی با ماندگاری مناسب استفاده روزانه.', 1890000, 13, '50% 50%'],
    ['p-tie-men', 'clothing', 'کراوات ابریشمی مردانه', 'کراوات ابریشمی ساده برای استایل رسمی و مراسم.', 680000, 12, '50% 50%'],
    ['p-socks-unisex', 'clothing', 'جوراب نخی رنگی', 'جوراب نخی نرم با طرح‌های متنوع برای استفاده روزانه.', 145000, 40, '50% 50%'],
    ['p-hammer', 'tools', 'چکش پنجه‌ای فولادی', 'چکش مقاوم برای تعمیرات خانه و کارگاه.', 420000, 22, '50% 50%'],
    ['p-screwdriver-set', 'tools', 'ست پیچ‌گوشتی چندکاره', 'ست پیچ‌گوشتی با سری‌های متنوع و دسته ضدلغزش.', 680000, 18, '50% 50%'],
    ['p-toolbox', 'tools', 'جعبه ابزار خانگی', 'جعبه ابزار جمع‌وجور برای نگهداری ابزارهای ضروری.', 1450000, 8, '50% 50%'],
    ['p-drill', 'tools', 'دریل شارژی سبک', 'دریل شارژی مناسب کارهای نصب و سوراخ‌کاری روزمره.', 3890000, 6, '50% 50%'],
    ['p-tape-measure', 'tools', 'متر نواری پنج متری', 'متر فلزی دقیق با قفل ایمن و بدنه مقاوم.', 240000, 35, '50% 50%'],
  ] as const) statements.push(db.prepare("INSERT INTO products (id,owner_category_id,title,description,status,price,stock,image_position,attributes,created_by,updated_at) VALUES (?,?,?,?,'published',?,?,?,?,?,?)").bind(row[0], row[1], row[2], row[3], row[4], row[5], row[6], '{}', adminId, createdAt));
  await db.batch(statements);
  const imageUpdates = [
    ['/product-images/tools.jpg', ['p-hammer', 'p-screwdriver-set', 'p-drill', 'p-tape-measure']],
    ['/product-images/toolbox.png', ['p-toolbox']],
    ['/product-images/fashion.jpg', ['p-shirt-women', 'p-trousers-women', 'p-dress-women']],
    ['/product-images/accessories.webp', ['p-perfume-unisex']],
    ['/product-images/shirt-men.jpg', ['p-shirt-men']],
    ['/product-images/trousers-men.jpg', ['p-trousers-men']],
    ['/product-images/belt-men.jpg', ['p-belt-men']],
    ['/product-images/tie-men.jpg', ['p-tie-men']],
    ['/product-images/shoes-unisex.jpg', ['p-shoes-unisex']],
    ['/product-images/socks-unisex.jpg', ['p-socks-unisex']],
  ] as const;
  await db.batch(imageUpdates.flatMap(([image, ids]) => ids.map((id) => db.prepare('UPDATE products SET image_url=? WHERE id=?').bind(image, id))));
}
