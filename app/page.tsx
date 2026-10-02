'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LogIn,
  Bot,
  Package,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Truck,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'super_admin' | 'category_admin';
};
type Product = {
  id: string;
  category_id: string;
  category_name: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  image_position: string;
  image_url: string | null;
};
type Category = {
  id: string;
  name: string;
  slug: string;
  requires_approval: number;
};
type CartLine = Product & { quantity: number };
type AdvisorMessage = {
  role: 'user' | 'assistant';
  content: string;
  productIds?: string[];
};
type Order = {
  id: string;
  payment_status: string;
  total: number;
  created_at: string;
  items: { title: string; quantity: number }[];
  fulfillments: {
    category_name: string;
    status: string;
    tracking_code: string | null;
  }[];
};
type AdminData = {
  categories: Category[];
  fulfillments: {
    id: string;
    order_id: string;
    category_name: string;
    status: string;
    total: number;
  }[];
  assignments: { user_name: string; email: string; category_name: string }[];
};
const persian = new Intl.NumberFormat('fa-IR');
const money = (n: number) => `${persian.format(n)} تومان`;
const individualPhotos = new Set([
  '/product-images/shirt-men.jpg',
  '/product-images/trousers-men.jpg',
  '/product-images/belt-men.jpg',
  '/product-images/tie-men.jpg',
  '/product-images/shoes-unisex.jpg',
  '/product-images/socks-unisex.jpg',
]);

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...options, headers });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'خطا در ارتباط با سرویس');
  return data;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [catalog, setCatalog] = useState<{
    products: Product[];
    categories: Category[];
  }>({ products: [], categories: [] });
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('همه');
  const [recommendedIds, setRecommendedIds] = useState<string[] | null>(null);
  const [mode, setMode] = useState<'shop' | 'orders' | 'admin'>('shop');
  const [notice, setNotice] = useState('');
  const load = async () => {
    try {
      const [session, nextCatalog] = await Promise.all([
        request<{ user: User | null }>('/api/me'),
        request<{ products: Product[]; categories: Category[] }>(
          '/api/catalog',
        ),
      ]);
      setUser(session.user);
      setCatalog(nextCatalog);
      const parameters = new URLSearchParams(window.location.search);
      const productId = parameters.get('add');
      const selectedProduct = nextCatalog.products.find(
        (product) => product.id === productId && product.stock > 0,
      );
      if (selectedProduct) {
        setCart((current) => {
          const existing = current.find((item) => item.id === selectedProduct.id);
          return existing
            ? current.map((item) =>
                item.id === selectedProduct.id
                  ? {
                      ...item,
                      quantity: Math.min(item.quantity + 1, item.stock),
                    }
                  : item,
              )
            : [...current, { ...selectedProduct, quantity: 1 }];
        });
        setNotice(`${selectedProduct.title} به سبد خرید اضافه شد.`);
      } else if (parameters.get('payment') === 'success') {
        const orderId = parameters.get('order');
        setNotice(
          orderId
            ? `پرداخت سفارش ${orderId.slice(0, 8)} با موفقیت ثبت شد.`
            : 'پرداخت با موفقیت ثبت شد.',
        );
      }
      if (parameters.has('add') || parameters.has('payment')) {
        parameters.delete('add');
        parameters.delete('payment');
        parameters.delete('order');
        const query = parameters.toString();
        window.history.replaceState(null, '', query ? `/?${query}` : '/');
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'بارگیری انجام نشد.');
    }
  };
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);
  const products = useMemo(
    () =>
      catalog.products.filter(
        (item) =>
          (recommendedIds === null || recommendedIds.includes(item.id)) &&
          (category === 'همه' || item.category_name === category) &&
          `${item.title} ${item.description}`.includes(query.trim()),
      ),
    [catalog.products, category, query, recommendedIds],
  );
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const add = (product: Product) =>
    setCart((now) => {
      const found = now.find((item) => item.id === product.id);
      return found
        ? now.map((item) =>
            item.id === product.id
              ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) }
              : item,
          )
        : [...now, { ...product, quantity: 1 }];
    });
  const quantity = (id: string, next: number) =>
    setCart((now) =>
      next < 1
        ? now.filter((item) => item.id !== id)
        : now.map((item) =>
            item.id === id
              ? { ...item, quantity: Math.min(next, item.stock) }
              : item,
          ),
    );
  return (
    <main className="min-h-screen bg-[#faf6ef] text-[#1b1815]" dir="rtl">
      <header className="sticky top-0 z-30 border-b border-[#e8dfd2] bg-[#faf6ef]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8">
          <button
            className="text-xl font-black text-[#14332b]"
            onClick={() => setMode('shop')}
          >
            همه‌چی <span className="text-[#e8a33d]">/</span>
          </button>
          <div className="hidden flex-1 md:block">
            <Input
              value={query}
              onChange={(e) => { setRecommendedIds(null); setQuery(e.target.value); }}
              placeholder="جست‌وجوی کالا…"
              className="rounded-2xl bg-white"
            />
          </div>
          {user && (
            <Button variant="ghost" onClick={() => setMode('orders')}>
              <Package /> سفارش‌های من
            </Button>
          )}
          {user?.role !== 'customer' && user && (
            <Button variant="ghost" onClick={() => user.role === 'super_admin' ? window.location.assign('/admin') : setMode('admin')}>
              پنل مدیریت
            </Button>
          )}
          {user ? (
            <Button
              variant="outline"
              onClick={() =>
                void request('/api/auth/logout', {
                  method: 'POST',
                  body: '{}',
                }).then(() => {
                  setUser(null);
                  setMode('shop');
                })
              }
            >
              {user.name}
            </Button>
          ) : (
            <Auth onSuccess={setUser} />
          )}
          <Cart
            cart={cart}
            total={total}
            user={user}
            quantity={quantity}
            setNotice={setNotice}
          />
        </div>
      </header>
      <AiAssistant
        products={catalog.products}
        onRecommendation={(ids) => {
          setRecommendedIds(ids);
          setCategory('همه');
          setQuery('');
          setMode('shop');
          window.setTimeout(() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        }}
      />
      {notice && (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <div className="rounded-2xl bg-[#14332b] px-4 py-3 text-sm text-white">
            {notice}
            <button className="mr-4 underline" onClick={() => setNotice('')}>
              بستن
            </button>
          </div>
        </div>
      )}
      {mode === 'shop' && (
        <Store
          categories={catalog.categories}
          category={category}
          setCategory={(next) => { setRecommendedIds(null); setCategory(next); }}
          query={query}
          setQuery={(next) => { setRecommendedIds(null); setQuery(next); }}
          products={products}
          recommendedIds={recommendedIds}
          clearRecommendation={() => setRecommendedIds(null)}
          add={add}
        />
      )}{' '}
      {mode === 'orders' && <Orders user={user} />}{' '}
      {mode === 'admin' && <Admin user={user} onError={setNotice} />}
    </main>
  );
}

function AiAssistant({ products, onRecommendation }: { products: Product[]; onRecommendation: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    { role: 'assistant', content: 'سلام! من اصغرآقا، مشاور خرید سایت همه‌چی هستم. برای چه مناسبتی دنبال خریدید؟' },
  ]);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setPrompt('');
    setBusy(true);
    try {
      const response = await request<{ reply: string; kind: 'question' | 'recommendation' | 'out_of_scope'; productIds: string[] }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const ids = response.kind === 'recommendation' ? response.productIds : [];
      setMessages((current) => [...current, { role: 'assistant', content: response.reply || 'پاسخی دریافت نشد.', productIds: ids }]);
      if (response.kind === 'recommendation') onRecommendation(ids);
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', content: error instanceof Error ? error.message : 'خطا در اتصال.' }]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {!open && (
        <button
          type="button"
          className="chat-launcher"
          aria-label="باز کردن مشاور خرید اصغرآقا"
          aria-expanded="false"
          aria-controls="shop-chat-panel"
          onClick={() => setOpen(true)}
        >
          <Bot size={21} aria-hidden="true" />
          <span>مشاوره با اصغرآقا</span>
        </button>
      )}
      {open && (
        <section id="shop-chat-panel" className="chat-panel" dir="rtl" aria-label="مشاور خرید اصغرآقا">
          <div className="chat-panel-header">
            <span className="chat-panel-icon"><Bot size={20} aria-hidden="true" /></span>
            <div><strong>اصغرآقا</strong><small>مشاور خرید سایت همه‌چی</small></div>
            <button type="button" className="chat-panel-close" aria-label="بستن چت" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="chat-messages" role="log" aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={`chat-message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}>
                <span>{message.content}</span>
                {message.productIds && message.productIds.length > 0 && (
                  <div className="chat-product-list">
                    {message.productIds.map((id) => {
                      const product = products.find((item) => item.id === id);
                      return product ? <Link key={id} href={`/products/${id}`} className="chat-product-link"><span>{product.title}</span><b>{money(product.price)}</b></Link> : null;
                    })}
                    <button type="button" className="chat-show-products" onClick={() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>دیدن پیشنهادها در فروشگاه ←</button>
                  </div>
                )}
              </div>
            ))}
            {busy && <p className="chat-message is-assistant">در حال پاسخ دادن…</p>}
          </div>
          <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <Input
              value={prompt}
              maxLength={3000}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="پیامتان را بنویسید…"
              aria-label="پیام چت"
            />
            <Button type="submit" disabled={busy || !prompt.trim()}>ارسال</Button>
          </form>
        </section>
      )}
    </>
  );
}

function Store({
  categories,
  category,
  setCategory,
  query,
  setQuery,
  products,
  recommendedIds,
  clearRecommendation,
  add,
}: {
  categories: Category[];
  category: string;
  setCategory: (x: string) => void;
  query: string;
  setQuery: (x: string) => void;
  products: Product[];
  recommendedIds: string[] | null;
  clearRecommendation: () => void;
  add: (x: Product) => void;
}) {
  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-7 px-4 py-12 md:grid-cols-[1.1fr_.9fr] md:px-8">
        <div>
          <p className="mb-3 font-bold text-[#1f6f5c]">
            فروشگاه چنددسته‌ای، یک خرید ساده
          </p>
          <h1 className="max-w-xl text-4xl font-black leading-tight text-[#14332b] md:text-6xl">
            هر چیزی که لازم دارید، با مدیریت دقیق هر دسته.
          </h1>
          <p className="mt-5 max-w-lg leading-8 text-[#71675c]">
            سفارش شما پس از پرداخت به‌صورت جداگانه برای هر دسته آماده می‌شود.
          </p>
          <div className="mt-7 md:hidden">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جست‌وجوی کالا…"
            />
          </div>
        </div>
        <div className="rounded-[2rem] bg-[#14332b] p-8 text-white">
          <Truck className="mb-8 h-10 w-10 text-[#e8a33d]" />
          <h2 className="text-2xl font-black">ارسال چندبخشیِ شفاف</h2>
          <p className="mt-4 leading-8 text-white/75">
            هر بخش سفارش وضعیت و کد رهگیری خودش را در حساب شما دارد.
          </p>
        </div>
      </section>
      <section id="store-products" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-14 md:px-8">
        {recommendedIds !== null && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#bdd9ca] bg-[#e9f4ed] p-4">
            <div><strong className="text-[#14332b]">پیشنهادهای اصغرآقا برای شما</strong><p className="mt-1 text-sm text-[#526a5e]">{recommendedIds.length ? `${persian.format(products.length)} محصول متناسب با نیازتان` : 'فعلاً محصول متناسبی در فروشگاه موجود نیست.'}</p></div>
            <Button type="button" variant="outline" onClick={clearRecommendation}>نمایش همهٔ محصولات</Button>
          </div>
        )}
        <div className="mb-5 flex flex-wrap gap-2">
          <Button
            className="rounded-full"
            variant={category === 'همه' ? 'default' : 'secondary'}
            onClick={() => setCategory('همه')}
          >
            همه
          </Button>
          {categories.map((item) => (
            <Button
              key={item.id}
              className="rounded-full"
              variant={category === item.name ? 'default' : 'secondary'}
              onClick={() => setCategory(item.name)}
            >
              {item.name}
            </Button>
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-[1.5rem] border border-[#e8dfd2] bg-white shadow-sm"
            >
              {item.image_url && individualPhotos.has(item.image_url) ? (
                <img src={item.image_url} alt={item.title} loading="lazy" className="h-36 w-full bg-[#f8f7f4] object-contain" />
              ) : (
                <div
                  className="h-36 bg-gradient-to-bl from-[#dcebe4] via-[#f4d7ba] to-[#e8a33d]"
                  style={{
                    backgroundPosition: item.image_position,
                    backgroundImage: item.image_url ? `url("${item.image_url}")` : undefined,
                    backgroundSize: item.image_url ? 'cover' : undefined,
                  }}
                />
              )}
              <div className="p-5">
                <span className="text-xs font-bold text-[#1f6f5c]">
                  {item.category_name}
                </span>
                <h3 className="mt-2 text-lg font-black"><Link href={`/products/${item.id}`}>{item.title}</Link></h3>
                <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-[#71675c]">
                  {item.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <b>{money(item.price)}</b>
                  <span className="text-xs text-[#71675c]">
                    {persian.format(item.stock)} موجود
                  </span>
                </div>
                <Button
                  className="mt-4 w-full rounded-xl"
                  disabled={item.stock < 1}
                  onClick={() => add(item)}
                >
                  <ShoppingBag /> افزودن به سبد
                </Button>
              </div>
            </article>
          ))}
        </div>
        {!products.length && (
          <p className="py-12 text-center text-[#71675c]">
            {recommendedIds !== null ? 'فعلاً کالای مناسبی در این پیشنهاد پیدا نشد.' : 'کالایی مطابق جست‌وجوی شما پیدا نشد.'}
          </p>
        )}
      </section>
    </>
  );
}

function Auth({ onSuccess }: { onSuccess: (user: User) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const submit = async (
    event: SubmitEvent & { currentTarget: HTMLFormElement },
    endpoint: string,
  ) => {
    event.preventDefault();
    try {
      const data = await request<{ user: User }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      });
      onSuccess(data.user);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    }
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
        <LogIn className="h-4 w-4" /> ورود
      </SheetTrigger>
      <SheetContent dir="rtl" className="overflow-auto">
        <SheetHeader>
          <SheetTitle>حساب همه‌چی</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="sms" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sms">ورود با پیامک</TabsTrigger>
            <TabsTrigger value="login">ورود با ایمیل</TabsTrigger>
            <TabsTrigger value="register">ثبت‌نام</TabsTrigger>
          </TabsList>
          <TabsContent value="sms">
            <SmsLogin
              onError={setError}
              onSuccess={(u) => {
                onSuccess(u);
                setOpen(false);
              }}
            />
          </TabsContent>
          <TabsContent value="login">
            <form
              className="space-y-3 pt-5"
              onSubmit={(e) =>
                void submit(
                  e as unknown as SubmitEvent & {
                    currentTarget: HTMLFormElement;
                  },
                  '/api/auth/login',
                )
              }
            >
              <Input name="email" type="email" placeholder="ایمیل" required />
              <Input
                name="password"
                type="password"
                placeholder="رمز عبور"
                required
              />
              <Button className="w-full" type="submit">
                ورود به حساب
              </Button>
            </form>
            <p className="mt-5 rounded-xl bg-[#f1e8dc] p-3 text-xs leading-6">
              حساب مشتری: customer@hamechi.test / Customer123!
              <br />
              مدیر کل: admin@hamechi.test / Admin123!
            </p>
          </TabsContent>
          <TabsContent value="register">
            <form
              className="space-y-3 pt-5"
              onSubmit={(e) =>
                void submit(
                  e as unknown as SubmitEvent & {
                    currentTarget: HTMLFormElement;
                  },
                  '/api/auth/register',
                )
              }
            >
              <Input name="name" placeholder="نام و نام خانوادگی" required />
              <Input name="email" type="email" placeholder="ایمیل" required />
              <Input
                name="password"
                type="password"
                minLength={10}
                placeholder="رمز عبور (حداقل ۱۰ کاراکتر)"
                required
              />
              <Button className="w-full" type="submit">
                ساخت حساب
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      </SheetContent>
    </Sheet>
  );
}

function SmsLogin({
  onSuccess,
  onError,
}: {
  onSuccess: (user: User) => void;
  onError: (message: string) => void;
}) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    onError('');
    try {
      await task();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'خطا');
    } finally {
      setBusy(false);
    }
  };
  const sendCode = () =>
    run(async () => {
      const data = await request<{ resendIn: number }>('/api/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      setSent(true);
      setCode('');
      setCooldown(data.resendIn);
    });
  const verify = () =>
    run(async () => {
      const data = await request<{ user: User }>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      });
      onSuccess(data.user);
    });
  return (
    <form
      className="space-y-3 pt-5"
      onSubmit={(e) => {
        e.preventDefault();
        void (sent ? verify() : sendCode());
      }}
    >
      <Input
        dir="ltr"
        inputMode="tel"
        autoComplete="tel"
        placeholder="شماره موبایل، مثل 09121234567"
        value={phone}
        disabled={sent}
        onChange={(e) => setPhone(e.target.value)}
        required
      />
      {sent && (
        <>
          <p className="text-xs leading-6 text-muted-foreground">
            کد ۶ رقمی به شمارهٔ بالا پیامک شد.
          </p>
          <Input
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="کد تأیید"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </>
      )}
      <Button className="w-full" type="submit" disabled={busy}>
        {sent ? 'ورود' : 'ارسال کد'}
      </Button>
      {sent && (
        <div className="flex justify-between text-xs">
          <button
            type="button"
            className="underline disabled:no-underline disabled:opacity-60"
            disabled={busy || cooldown > 0}
            onClick={() => void sendCode()}
          >
            {cooldown > 0
              ? `ارسال دوباره تا ${persian.format(cooldown)} ثانیه دیگر`
              : 'ارسال دوباره کد'}
          </button>
          <button
            type="button"
            className="underline"
            onClick={() => {
              setSent(false);
              setCode('');
            }}
          >
            تغییر شماره
          </button>
        </div>
      )}
      <p className="text-xs leading-6 text-muted-foreground">
        اگر حساب نداشته باشید، با اولین ورود خودکار ساخته می‌شود.
      </p>
    </form>
  );
}

function Cart({
  cart,
  total,
  user,
  quantity,
  setNotice,
}: {
  cart: CartLine[];
  total: number;
  user: User | null;
  quantity: (id: string, q: number) => void;
  setNotice: (x: string) => void;
}) {
  const [address, setAddress] = useState('تهران، نشانی نمونه برای ارسال سفارش');
  const [loading, setLoading] = useState(false);
  const checkout = async () => {
    if (!user)
      return setNotice('ابتدا وارد حساب شوید، سپس خرید را ادامه دهید.');
    try {
      setLoading(true);
      const result = await request<{ paymentUrl: string }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          shippingAddress: address,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });
      window.location.assign(result.paymentUrl);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'خطا در ثبت سفارش');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Sheet>
      <SheetTrigger className="relative inline-flex h-9 items-center justify-center gap-2 rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground">
        <ShoppingCart className="h-4 w-4" />
        {cart.length > 0 && (
          <span className="mr-1 rounded-full bg-[#14332b] px-2 py-0.5 text-xs text-white">
            {persian.format(cart.length)}
          </span>
        )}
      </SheetTrigger>
      <SheetContent dir="rtl" className="overflow-auto">
        <SheetHeader>
          <SheetTitle>سبد خرید</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {cart.map((item) => (
            <div key={item.id} className="rounded-xl border p-3">
              <b>{item.title}</b>
              <div className="mt-2 flex items-center justify-between">
                <span>{money(item.price * item.quantity)}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => quantity(item.id, item.quantity - 1)}
                  >
                    −
                  </Button>
                  <span>{persian.format(item.quantity)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => quantity(item.id, item.quantity + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {cart.length ? (
          <>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-5 min-h-24 w-full rounded-xl border p-3 text-sm"
              placeholder="نشانی ارسال"
            />
            <div className="mt-4 flex items-center justify-between font-black">
              <span>جمع کل</span>
              <span>{money(total)}</span>
            </div>
            <Button
              disabled={loading}
              className="mt-4 w-full"
              onClick={() => void checkout()}
            >
              ادامه و پرداخت آزمایشی
            </Button>
          </>
        ) : (
          <p className="mt-8 text-center text-[#71675c]">سبد شما خالی است.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Orders({ user }: { user: User | null }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (user)
      void request<{ orders: Order[] }>('/api/orders')
        .then((data) => setOrders(data.orders))
        .catch((e: Error) => setError(e.message));
  }, [user]);
  if (!user)
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <UserRound className="mx-auto h-12 w-12 text-[#1f6f5c]" />
        <h1 className="mt-4 text-2xl font-black">حساب کاربری</h1>
        <p className="mt-2 text-[#71675c]">
          پس از ورود، سفارش‌ها و وضعیت ارسال را اینجا می‌بینید.
        </p>
      </section>
    );
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-black text-[#14332b]">
        سفارش‌های {user.name}
      </h1>
      {error && <p className="mt-4 text-red-700">{error}</p>}
      <div className="mt-7 space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <b>سفارش {order.id.slice(0, 8)}</b>
                <p className="mt-1 text-sm text-[#71675c]">
                  {money(order.total)}
                </p>
              </div>
              <span className="rounded-full bg-[#dcebe4] px-3 py-1 text-sm font-bold text-[#14332b]">
                {order.payment_status === 'paid'
                  ? 'پرداخت شده'
                  : 'در انتظار پرداخت'}
              </span>
            </div>
            <div className="mt-4 border-t pt-4 text-sm">
              {order.items.map((item) => (
                <p key={item.title}>
                  {item.title} × {persian.format(item.quantity)}
                </p>
              ))}
              <Link className="mt-3 inline-block text-[#1f6f5c] underline" href={`/invoice/${order.id}`}>مشاهده و چاپ فاکتور</Link>
              <Link className="mr-5 text-[#1f6f5c] underline" href={`/support?order=${order.id}`}>درخواست، مرجوعی و پشتیبانی</Link>
              {order.fulfillments.map((item) => (
                <p key={item.category_name} className="mt-2 text-[#1f6f5c]">
                  {item.category_name}: {item.status}
                  {item.tracking_code ? ` · ${item.tracking_code}` : ''}
                </p>
              ))}
            </div>
          </article>
        ))}
        {!orders.length && (
          <p className="rounded-2xl bg-white p-8 text-center text-[#71675c]">
            هنوز سفارشی ثبت نکرده‌اید.
          </p>
        )}
      </div>
    </section>
  );
}

function Admin({
  user,
  onError,
}: {
  user: User | null;
  onError: (x: string) => void;
}) {
  const [data, setData] = useState<AdminData | null>(null);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const load = () =>
    request<AdminData>('/api/admin/summary')
      .then(setData)
      .catch((e: Error) => onError(e.message));
  useEffect(() => {
    if (user?.role !== 'customer')
      void request<AdminData>('/api/admin/summary')
        .then(setData)
        .catch((e: Error) => onError(e.message));
  }, [user, onError]);
  if (!user || user.role === 'customer')
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-black">دسترسی مدیریت لازم است</h1>
      </section>
    );
  const create = async (e: SubmitEvent) => {
    e.preventDefault();
    try {
      await request('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          categoryId,
          title,
          description: 'کالای ثبت‌شده از پنل مدیریت.',
          price: Number(price),
          stock: Number(stock),
        }),
      });
      setTitle('');
      setPrice('');
      setStock('');
      void load();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'خطا');
    }
  };
  const update = async (id: string, status: string) => {
    try {
      await request('/api/admin/fulfillments', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      void load();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'خطا');
    }
  };
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-3xl font-black text-[#14332b]">پنل مدیریت</h1>
      <p className="mt-2 text-[#71675c]">
        سطح دسترسی شما:{' '}
        {user.role === 'super_admin' ? 'مدیر کل' : 'ادمین دامنه‌محور'}
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="font-black">ثبت کالای جدید</h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => void create(e as unknown as SubmitEvent)}
          >
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 w-full rounded-md border px-3"
              required
            >
              <option value="">دسته را انتخاب کنید</option>
              {data?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="نام کالا"
              required
            />
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="numeric"
              placeholder="قیمت به تومان"
              required
            />
            <Input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              inputMode="numeric"
              placeholder="موجودی"
              required
            />
            <Button className="w-full" type="submit">
              <Plus /> ثبت کالا
            </Button>
          </form>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="font-black">دسترسی‌های دامنه‌ای</h2>
          {data?.assignments.length ? (
            data.assignments.map((a) => (
              <p
                key={`${a.email}-${a.category_name}`}
                className="mt-3 rounded-xl bg-[#f1e8dc] p-3 text-sm"
              >
                {a.user_name} — {a.category_name}
              </p>
            ))
          ) : (
            <p className="mt-4 text-sm text-[#71675c]">
              شما فقط دسته‌های تخصیص‌یافتهٔ خود را می‌بینید.
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 rounded-2xl border bg-white p-5">
        <h2 className="font-black">بخش‌های ارسال سفارش</h2>
        <div className="mt-4 space-y-3">
          {data?.fulfillments.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#faf6ef] p-4"
            >
              <span>
                {item.category_name} · سفارش {item.order_id.slice(0, 8)} ·{' '}
                رسیدگی به مرسوله
              </span>
              <select
                value={item.status}
                onChange={(e) => void update(item.id, e.target.value)}
                className="rounded-md border bg-white px-3 py-2 text-sm"
              >
                <option value="pending">در انتظار</option>
                <option value="preparing">در حال آماده‌سازی</option>
                <option value="shipped">ارسال شد</option>
                <option value="delivered">تحویل شد</option>
                <option value="unavailable">ناموجود</option>
              </select>
            </div>
          ))}
          {data && !data.fulfillments.length && (
            <p className="text-sm text-[#71675c]">فعلاً ارسالی وجود ندارد.</p>
          )}
        </div>
      </div>
    </section>
  );
}
