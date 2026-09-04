'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Bell,
  Boxes,
  ChevronLeft,
  CircleCheck,
  Headphones,
  Heart,
  LayoutDashboard,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Store,
  Truck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type View = 'store' | 'super-admin' | 'category-admin';
type Category = 'همه' | 'الکترونیک' | 'پوشاک' | 'آرایشی' | 'سلامت';

const categories = [
  {
    name: 'الکترونیک',
    count: '۱٬۲۸۰ کالا',
    className: 'cat-electronics',
    icon: Headphones,
  },
  {
    name: 'پوشاک',
    count: '۲٬۴۶۰ کالا',
    className: 'cat-clothing',
    icon: ShoppingBag,
  },
  { name: 'آرایشی', count: '۹۴۰ کالا', className: 'cat-beauty', icon: Sparkles },
  {
    name: 'سلامت',
    count: '۶۳۰ کالا',
    className: 'cat-health',
    icon: Stethoscope,
  },
] as const;

const products = [
  {
    id: 1,
    name: 'هدفون بی‌سیم استودیو',
    category: 'الکترونیک',
    price: 4890000,
    oldPrice: 5290000,
    color: '#2c3e8f',
    position: '8% 72%',
    badge: 'ارسال امروز',
  },
  {
    id: 2,
    name: 'بافت یقه‌دار آجری',
    category: 'پوشاک',
    price: 1240000,
    oldPrice: 1450000,
    color: '#c05a3a',
    position: '39% 67%',
    badge: 'پرفروش',
  },
  {
    id: 3,
    name: 'سرم آبرسان روزانه',
    category: 'آرایشی',
    price: 690000,
    oldPrice: 760000,
    color: '#9c3f63',
    position: '63% 74%',
    badge: 'جدید',
  },
  {
    id: 4,
    name: 'مکمل ویتامین روزانه',
    category: 'سلامت',
    price: 385000,
    oldPrice: 420000,
    color: '#1f6f5c',
    position: '74% 75%',
    badge: 'تأیید اصالت',
  },
] as const;

const accessRows = [
  {
    name: 'علی احمدی',
    role: 'ادمین دسته',
    initials: 'ع.ا',
    grants: [false, true, false, true],
  },
  {
    name: 'مریم توسلی',
    role: 'ادمین دسته',
    initials: 'م.ت',
    grants: [true, false, false, false],
  },
  {
    name: 'سارا محمدی',
    role: 'ادمین دسته',
    initials: 'س.م',
    grants: [false, true, true, false],
  },
  {
    name: 'دکتر رضوی',
    role: 'مسئول سلامت',
    initials: 'د.ر',
    grants: [false, false, false, true],
  },
] as const;

const formatPrice = (value: number) =>
  `${new Intl.NumberFormat('fa-IR').format(value)} تومان`;

type WebMcpContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

export default function Home() {
  const [view, setView] = useState<View>('store');
  const [category, setCategory] = useState<Category>('همه');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<number[]>([]);
  const [notice, setNotice] = useState('');

  const filteredProducts = useMemo(() => {
    const normalized = query.trim();
    return products.filter((product) => {
      const categoryMatch = category === 'همه' || product.category === category;
      const queryMatch =
        !normalized ||
        `${product.name} ${product.category}`.includes(normalized);
      return categoryMatch && queryMatch;
    });
  }, [category, query]);

  const cartProducts = cart
    .map((id) => products.find((product) => product.id === id)!)
    .filter(Boolean);
  const cartTotal = cartProducts.reduce(
    (total, product) => total + product.price,
    0,
  );

  function addToCart(id: number) {
    setCart((current) => [...current, id]);
    setNotice('کالا به سبد خرید اضافه شد.');
    window.setTimeout(() => setNotice(''), 1800);
  }

  useEffect(() => {
    const context = (document as Document & { modelContext?: WebMcpContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    void Promise.resolve(
      context.registerTool(
        {
          name: 'add_product_to_cart',
          title: 'افزودن کالا به سبد',
          description:
            'یک کالای موجود در ویترین همه‌چی را با شناسه‌اش به سبد خرید قابل‌مشاهده اضافه می‌کند.',
          inputSchema: {
            type: 'object',
            properties: {
              productId: {
                type: 'integer',
                enum: products.map((product) => product.id),
              },
            },
            required: ['productId'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            const productId = (input as { productId?: unknown })?.productId;
            const product = products.find((item) => item.id === productId);
            if (!product) throw new Error('شناسهٔ کالا معتبر نیست.');
            setCart((current) => [...current, product.id]);
            setNotice(`${product.name} به سبد خرید اضافه شد.`);
            return { productId: product.id, cartUpdated: true };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground" dir="rtl">
      <a className="skip-link" href="#main-content">
        رفتن به محتوای اصلی
      </a>
      <header className="site-header">
        <div className="shell header-row">
          <button
            className="brand"
            onClick={() => setView('store')}
            aria-label="همه‌چی، صفحه اصلی"
          >
            <span className="brand-mark">
              <Store size={21} strokeWidth={2.4} />
            </span>
            <span>همه‌چی</span>
          </button>

          <nav className="view-nav" aria-label="نمای سایت">
            <button
              className={view === 'store' ? 'is-active' : ''}
              onClick={() => setView('store')}
            >
              فروشگاه
            </button>
            <button
              className={view === 'super-admin' ? 'is-active' : ''}
              onClick={() => setView('super-admin')}
            >
              مدیر کل
            </button>
            <button
              className={view === 'category-admin' ? 'is-active' : ''}
              onClick={() => setView('category-admin')}
            >
              ادمین دسته
            </button>
          </nav>

          <div className="header-actions">
            <Button variant="ghost" size="icon-lg" aria-label="علاقه‌مندی‌ها">
              <Heart />
            </Button>
            <Button variant="ghost" size="icon-lg" aria-label="حساب کاربری">
              <UserRound />
            </Button>
            <Sheet>
              <SheetTrigger
                render={<Button className="cart-trigger" size="lg" />}
              >
                <ShoppingCart />
                <span>سبد</span>
                {cart.length > 0 && (
                  <span className="cart-count">
                    {cart.length.toLocaleString('fa-IR')}
                  </span>
                )}
              </SheetTrigger>
              <SheetContent side="left" className="cart-sheet" dir="rtl">
                <SheetHeader className="border-b border-border px-6 py-5">
                  <SheetTitle className="text-xl font-extrabold">
                    سبد خرید
                  </SheetTitle>
                  <SheetDescription>
                    کالاها بر اساس دسته در مرسوله‌های جدا آماده می‌شوند.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-1 flex-col gap-3 overflow-auto px-6 py-3">
                  {cartProducts.length === 0 ? (
                    <div className="empty-cart">
                      <ShoppingBag />
                      <b>سبد شما خالی است</b>
                      <span>یک انتخاب خوب، شروع یک خرید خوب است.</span>
                    </div>
                  ) : (
                    cartProducts.map((product, index) => (
                      <div className="cart-line" key={`${product.id}-${index}`}>
                        <span
                          className="cart-line-mark"
                          style={{ background: product.color }}
                        />
                        <div>
                          <b>{product.name}</b>
                          <span>{product.category}</span>
                        </div>
                        <strong>{formatPrice(product.price)}</strong>
                      </div>
                    ))
                  )}
                </div>
                <SheetFooter className="border-t border-border px-6 py-5">
                  <div className="mb-2 flex items-center justify-between text-base">
                    <span>جمع کالاها</span>
                    <b>{formatPrice(cartTotal)}</b>
                  </div>
                  <Button
                    className="h-12 w-full text-base font-bold"
                    disabled={!cart.length}
                  >
                    ادامه و انتخاب روش ارسال
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {view === 'store' && (
        <div id="main-content">
          <section className="hero shell" aria-labelledby="hero-title">
            <Image
              src="/hero-products.png"
              alt="چیدمان محصولاتی از دسته‌های الکترونیک، پوشاک، آرایشی و سلامت"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 1200px"
              className="hero-image"
            />
            <div className="hero-shade" />
            <div className="hero-copy">
              <Badge className="hero-badge">خرید چنددسته‌ای، یک‌جا</Badge>
              <h1 id="hero-title">
                برای هر سلیقه،
                <br />
                یک انتخاب تازه.
              </h1>
              <p>
                از هدفون تا مراقبت روزانه؛ با ارسال شفاف، قیمت روشن و اصالت قابل
                پیگیری.
              </p>
              <search className="hero-search">
                <Search aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="جست‌وجوی کالا یا دسته…"
                  aria-label="جست‌وجوی کالا"
                />
                <Button
                  onClick={() =>
                    document
                      .getElementById('products')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  جست‌وجو
                </Button>
              </search>
            </div>
            <div className="hero-note">
              <Truck />
              <span>
                <b>ارسال تفکیک‌شده و دقیق</b>
                <small>وضعیت هر مرسوله را جدا ببینید</small>
              </span>
            </div>
          </section>

          <section
            className="shell section-block"
            aria-labelledby="categories-title"
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">مسیر سریع</span>
                <h2 id="categories-title">از کدام قفسه شروع می‌کنید؟</h2>
              </div>
              <button className="text-link" onClick={() => setCategory('همه')}>
                دیدن همه <ChevronLeft />
              </button>
            </div>
            <div className="category-grid">
              {categories.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    className={`category-card ${item.className}`}
                    onClick={() => {
                      setCategory(item.name as Category);
                      document
                        .getElementById('products')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <span className="category-icon">
                      <Icon />
                    </span>
                    <span>
                      <b>{item.name}</b>
                      <small>{item.count}</small>
                    </span>
                    <ChevronLeft className="category-arrow" />
                  </button>
                );
              })}
            </div>
          </section>

          <section
            id="products"
            className="shell section-block products-section"
            aria-labelledby="products-title"
          >
            <div className="section-heading products-heading">
              <div>
                <span className="eyebrow">منتخب این هفته</span>
                <h2 id="products-title">پیشنهادهای همه‌چی</h2>
              </div>
              <div className="filter-pills" aria-label="فیلتر دسته‌بندی">
                {(
                  ['همه', 'الکترونیک', 'پوشاک', 'آرایشی', 'سلامت'] as Category[]
                ).map((item) => (
                  <button
                    key={item}
                    className={category === item ? 'is-active' : ''}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            {filteredProducts.length > 0 ? (
              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <article className="product-card" key={product.id}>
                    <div
                      className="product-image"
                      style={{
                        backgroundImage: "url('/hero-products.png')",
                        backgroundPosition: product.position,
                      }}
                    >
                      <Badge className="product-badge">{product.badge}</Badge>
                      <button
                        aria-label={`افزودن ${product.name} به علاقه‌مندی‌ها`}
                      >
                        <Heart />
                      </button>
                    </div>
                    <div className="product-info">
                      <span
                        className="product-category"
                        style={{ color: product.color }}
                      >
                        {product.category}
                      </span>
                      <h3>{product.name}</h3>
                      <div className="price-row">
                        <div>
                          <b>{formatPrice(product.price)}</b>
                          <del>{formatPrice(product.oldPrice)}</del>
                        </div>
                        <Button
                          size="icon-lg"
                          onClick={() => addToCart(product.id)}
                          aria-label={`افزودن ${product.name} به سبد`}
                        >
                          <ShoppingBag />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-results">
                <Search />
                <h3>کالایی پیدا نشد</h3>
                <p>عبارت دیگری بنویسید یا فیلتر دسته را پاک کنید.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery('');
                    setCategory('همه');
                  }}
                >
                  پاک‌کردن فیلترها
                </Button>
              </div>
            )}
          </section>

          <section className="trust-strip">
            <div className="shell trust-grid">
              <div>
                <ShieldCheck />
                <span>
                  <b>اصالت قابل پیگیری</b>
                  <small>اطلاعات روشن هر کالا</small>
                </span>
              </div>
              <div>
                <PackageCheck />
                <span>
                  <b>مرسوله‌های شفاف</b>
                  <small>پیگیری جداگانه هر دسته</small>
                </span>
              </div>
              <div>
                <UsersRound />
                <span>
                  <b>پشتیبانی تخصصی</b>
                  <small>هر پرسش نزد کارشناس همان دسته</small>
                </span>
              </div>
            </div>
          </section>
        </div>
      )}

      {view === 'super-admin' && (
        <SuperAdmin onGoStore={() => setView('store')} />
      )}
      {view === 'category-admin' && <CategoryAdmin />}

      <div className="mobile-nav" aria-label="ناوبری موبایل">
        <button
          className={view === 'store' ? 'is-active' : ''}
          onClick={() => setView('store')}
        >
          <Store />
          <span>فروشگاه</span>
        </button>
        <button
          onClick={() => {
            setView('store');
            document.getElementById('products')?.scrollIntoView();
          }}
        >
          <Search />
          <span>جست‌وجو</span>
        </button>
        <button
          className={view === 'category-admin' ? 'is-active' : ''}
          onClick={() => setView('category-admin')}
        >
          <LayoutDashboard />
          <span>پنل</span>
        </button>
        <button
          onClick={() => setNotice('سبد خرید از دکمه بالای صفحه در دسترس است.')}
        >
          <ShoppingCart />
          <span>سبد</span>
        </button>
      </div>
      <output
        className={`notice ${notice ? 'is-visible' : ''}`}
        aria-live="polite"
      >
        <CircleCheck aria-hidden="true" />
        {notice}
      </output>
    </main>
  );
}

function SuperAdmin({ onGoStore }: { onGoStore: () => void }) {
  return (
    <div className="admin-shell shell" id="main-content">
      <aside className="admin-sidebar">
        <div>
          <span className="admin-avatar">ح.ن</span>
          <p>
            <b>حسام نادری</b>
            <small>مدیر کل</small>
          </p>
        </div>
        <nav aria-label="مدیریت کل">
          <button className="is-active">
            <LayoutDashboard />
            داشبورد
          </button>
          <button>
            <UsersRound />
            ماتریس دسترسی
          </button>
          <button>
            <Boxes />
            مدیریت دسته‌ها
          </button>
          <button>
            <PackageCheck />
            سفارش‌ها
          </button>
        </nav>
        <Button variant="outline" onClick={onGoStore}>
          بازگشت به فروشگاه
        </Button>
      </aside>
      <section className="admin-content">
        <div className="admin-top">
          <div>
            <span className="eyebrow">امروز، ۱۳ شهریور</span>
            <h1>داشبورد مدیر کل</h1>
          </div>
          <Button variant="outline" size="icon-lg" aria-label="اعلان‌ها">
            <Bell />
          </Button>
        </div>
        <div className="orphan-alert">
          <span>
            <b>یک دسته بدون مسئول است</b>
            <small>سلامت › مکمل‌های ورزشی</small>
          </span>
          <Button>تعیین مسئول</Button>
        </div>
        <div className="metric-grid">
          <Metric label="فروش امروز" value="۴۸٫۳ م" change="۱۲٪ بیشتر" />
          <Metric label="سفارش جدید" value="۱۳۷" change="۲۴ در انتظار" />
          <Metric
            label="نیازمند اقدام"
            value="۹"
            change="۳ فوری"
            tone="amber"
          />
          <Metric label="مرسوله باز" value="۱۴" change="۶ آماده ارسال" />
        </div>
        <section className="panel-card access-card">
          <div className="panel-title">
            <div>
              <span className="eyebrow">دامنه‌های فعال</span>
              <h2>ماتریس دسترسی</h2>
            </div>
            <Button variant="outline">ویرایش انتساب‌ها</Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>کاربر</th>
                  {categories.map((item) => (
                    <th key={item.name}>{item.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accessRows.map((row) => (
                  <tr key={row.name}>
                    <th scope="row" aria-label={`${row.name}، ${row.role}`}>
                      <span className="table-user">
                        <i>{row.initials}</i>
                        <span>
                          <b>{row.name}</b>
                          <small>{row.role}</small>
                        </span>
                      </span>
                    </th>
                    {row.grants.map((grant, index) => (
                      <td key={index}>
                        {grant ? (
                          <span className="grant">
                            <CircleCheck aria-hidden="true" />
                            فعال
                          </span>
                        ) : (
                          <span className="no-grant">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  change,
  tone,
}: {
  label: string;
  value: string;
  change: string;
  tone?: string;
}) {
  return (
    <article className={`metric-card ${tone ?? ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{change}</small>
    </article>
  );
}

function CategoryAdmin() {
  return (
    <div className="category-admin shell" id="main-content">
      <div className="admin-top">
        <div>
          <span className="eyebrow">دامنهٔ فعال: پوشاک و سلامت</span>
          <h1>پنل ادمین دسته</h1>
          <p>
            علی احمدی، فقط اطلاعات و درخواست‌های دامنه‌های شما نمایش داده می‌شود.
          </p>
        </div>
        <Button>
          <Boxes />
          افزودن کالا
        </Button>
      </div>
      <Tabs defaultValue="shipments" className="admin-tabs">
        <TabsList className="admin-tab-list">
          <TabsTrigger value="overview">داشبورد</TabsTrigger>
          <TabsTrigger value="products">کالاها</TabsTrigger>
          <TabsTrigger value="shipments">مرسوله‌ها</TabsTrigger>
          <TabsTrigger value="requests">درخواست‌ها</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="metric-grid">
            <Metric label="فروش دامنه" value="۱۸٫۹ م" change="امروز" />
            <Metric label="کالای منتشرشده" value="۸۴۶" change="۱۲ پیش‌نویس" />
            <Metric
              label="موجودی کم"
              value="۷"
              change="نیازمند اقدام"
              tone="amber"
            />
            <Metric
              label="درخواست باز"
              value="۵"
              change="میانگین پاسخ ۲ ساعت"
            />
          </div>
        </TabsContent>
        <TabsContent value="products">
          <div className="panel-card empty-results">
            <Boxes />
            <h3>کالاهای دامنهٔ شما</h3>
            <p>
              در نسخهٔ بعد، ورود اکسل و ویرایش ویژگی‌های دسته از همین‌جا انجام
              می‌شود.
            </p>
            <Button>افزودن اولین کالا</Button>
          </div>
        </TabsContent>
        <TabsContent value="shipments">
          <div className="queue-grid">
            <section className="panel-card queue-list">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">صف امروز</span>
                  <h2>مرسوله‌ها</h2>
                </div>
                <Badge className="amber-badge">۵ نیازمند اقدام</Badge>
              </div>
              {[
                ['#۱۰۲۴-۲', 'تی‌شرت M مشکی × ۲', 'پوشاک', 'تحویل به پست'],
                ['#۱۰۳۱-۱', 'مکمل ویتامین روزانه × ۱', 'سلامت', 'منتظر بررسی'],
                ['#۱۰۳۸-۲', 'بافت یقه‌دار آجری × ۱', 'پوشاک', 'آماده‌سازی'],
              ].map((item, index) => (
                <button
                  className={index === 0 ? 'queue-row is-active' : 'queue-row'}
                  key={item[0]}
                >
                  <span
                    className="queue-mark"
                    style={{ background: index === 1 ? '#1f6f5c' : '#c05a3a' }}
                  >
                    {index === 1 ? 'س' : 'پ'}
                  </span>
                  <span>
                    <b>{item[1]}</b>
                    <small>
                      {item[0]} · {item[2]}
                    </small>
                  </span>
                  <Badge variant="outline">{item[3]}</Badge>
                </button>
              ))}
            </section>
            <section className="panel-card shipment-detail">
              <span className="eyebrow">مرسولهٔ #۱۰۲۴-۲</span>
              <h2>آمادهٔ تحویل به پست</h2>
              <div className="timeline">
                <span className="done">
                  <i />
                  <b>پرداخت تأیید شد</b>
                  <small>امروز، ۹:۱۲</small>
                </span>
                <span className="done">
                  <i />
                  <b>بسته‌بندی انجام شد</b>
                  <small>امروز، ۱۱:۴۰</small>
                </span>
                <span>
                  <i />
                  <b>تحویل به پست</b>
                  <small>کد رهگیری را ثبت کنید</small>
                </span>
              </div>
              <label className="tracking-field" htmlFor="tracking-code">
                <span>کد رهگیری</span>
              </label>
              <Input
                id="tracking-code"
                dir="ltr"
                placeholder="مثلاً 204103…"
                className="tracking-input"
              />
              <Button className="h-11">ثبت و اطلاع به مشتری</Button>
            </section>
          </div>
        </TabsContent>
        <TabsContent value="requests">
          <div className="panel-card empty-results">
            <UsersRound />
            <h3>صندوق درخواست‌ها</h3>
            <p>
              پرسش کالا، مرجوعی و گارانتی فقط در دامنه‌های پوشاک و سلامت اینجا دیده
              می‌شوند.
            </p>
            <Button variant="outline">نمایش درخواست‌های باز</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
