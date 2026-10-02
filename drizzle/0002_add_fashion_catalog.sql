INSERT OR IGNORE INTO products (id, owner_category_id, title, description, status, price, stock, image_position, attributes, created_by, updated_at)
SELECT 'p-shirt-men', 'clothing', 'تی‌شرت مردانه کتان', 'تی‌شرت کتان خنک و راحت برای استفاده روزمره.', 'published', 390000, 25, '50% 50%', '{}', id, datetime('now') FROM users WHERE role='super_admin' LIMIT 1;
INSERT OR IGNORE INTO products (id, owner_category_id, title, description, status, price, stock, image_position, attributes, created_by, updated_at)
SELECT 'p-shirt-women', 'clothing', 'تی‌شرت زنانه اورسایز', 'تی‌شرت زنانه با برش آزاد و رنگ‌بندی متنوع.', 'published', 520000, 20, '50% 50%', '{}', id, datetime('now') FROM users WHERE role='super_admin' LIMIT 1;
INSERT OR IGNORE INTO products (id, owner_category_id, title, description, status, price, stock, image_position, attributes, created_by, updated_at)
SELECT 'p-trousers-men', 'clothing', 'شلوار جین مردانه', 'شلوار جین راسته با دوخت مقاوم و تن‌خور کلاسیک.', 'published', 1280000, 14, '50% 50%', '{}', id, datetime('now') FROM users WHERE role='super_admin' LIMIT 1;
INSERT OR IGNORE INTO products (id, owner_category_id, title, description, status, price, stock, image_position, attributes, created_by, updated_at)
SELECT 'p-trousers-women', 'clothing', 'شلوار پارچه‌ای زنانه', 'شلوار پارچه‌ای خوش‌دوخت مناسب استایل اداری و روزانه.', 'published', 980000, 18, '50% 50%', '{}', id, datetime('now') FROM users WHERE role='super_admin' LIMIT 1;
INSERT OR IGNORE INTO products (id, owner_category_id, title, description, status, price, stock, image_position, attributes, created_by, updated_at)
SELECT 'p-dress-women', 'clothing', 'پیراهن زنانه تابستانی', 'پیراهن سبک و رنگی برای روزهای گرم سال.', 'published', 1650000, 11, '50% 50%', '{}', id, datetime('now') FROM users WHERE role='super_admin' LIMIT 1;
INSERT OR IGNORE INTO products (id, owner_category_id, title, description, status, price, stock, image_position, attributes, created_by, updated_at)
SELECT 'p-belt-men', 'clothing', 'کمربند چرم مردانه', 'کمربند چرم طبیعی با سگک فلزی مات.', 'published', 740000, 16, '50% 50%', '{}', id, datetime('now') FROM users WHERE role='super_admin' LIMIT 1;
INSERT OR IGNORE INTO products (id, owner_category_id, title, description, status, price, stock, image_position, attributes, created_by, updated_at)
SELECT 'p-shoes-unisex', 'clothing', 'کتانی روزمره اسپرت', 'کتانی سبک و راحت برای استفاده روزمره، مناسب زنانه و مردانه.', 'published', 2350000, 9, '50% 50%', '{}', id, datetime('now') FROM users WHERE role='super_admin' LIMIT 1;
INSERT OR IGNORE INTO products (id, owner_category_id, title, description, status, price, stock, image_position, attributes, created_by, updated_at)
SELECT 'p-perfume-unisex', 'beauty', 'عطر روزانه چوبی', 'رایحه چوبی و مرکباتی با ماندگاری مناسب استفاده روزانه.', 'published', 1890000, 13, '50% 50%', '{}', id, datetime('now') FROM users WHERE role='super_admin' LIMIT 1;
INSERT OR IGNORE INTO products (id, owner_category_id, title, description, status, price, stock, image_position, attributes, created_by, updated_at)
SELECT 'p-tie-men', 'clothing', 'کراوات ابریشمی مردانه', 'کراوات ابریشمی ساده برای استایل رسمی و مراسم.', 'published', 680000, 12, '50% 50%', '{}', id, datetime('now') FROM users WHERE role='super_admin' LIMIT 1;
INSERT OR IGNORE INTO products (id, owner_category_id, title, description, status, price, stock, image_position, attributes, created_by, updated_at)
SELECT 'p-socks-unisex', 'clothing', 'جوراب نخی رنگی', 'جوراب نخی نرم با طرح‌های متنوع برای استفاده روزانه.', 'published', 145000, 40, '50% 50%', '{}', id, datetime('now') FROM users WHERE role='super_admin' LIMIT 1;
