'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LogIn,
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
};
type Category = {
  id: string;
  name: string;
  slug: string;
  requires_approval: number;
};
type CartLine = Product & { quantity: number };
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
          (category === 'همه' || item.category_name === category) &&
          `${item.title} ${item.description}`.includes(query.trim()),
      ),
    [catalog.products, category, query],
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
              onChange={(e) => setQuery(e.target.value)}
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
          setCategory={setCategory}
          query={query}
          setQuery={setQuery}
          products={products}
          add={add}
        />
      )}{' '}
      {mode === 'orders' && <Orders user={user} />}{' '}
      {mode === 'admin' && <Admin user={user} onError={setNotice} />}
    </main>
  );
}

function Store({
  categories,
  category,
  setCategory,
  query,
  setQuery,
  products,
  add,
}: {
  categories: Category[];
  category: string;
  setCategory: (x: string) => void;
  query: string;
  setQuery: (x: string) => void;
  products: Product[];
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
      <section className="mx-auto max-w-7xl px-4 pb-14 md:px-8">
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
              <div
                className="h-36 bg-gradient-to-bl from-[#dcebe4] via-[#f4d7ba] to-[#e8a33d]"
                style={{ backgroundPosition: item.image_position }}
              />
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
            کالایی مطابق جست‌وجوی شما پیدا نشد.
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
        <Tabs defaultValue="login" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">ورود</TabsTrigger>
            <TabsTrigger value="register">ثبت‌نام</TabsTrigger>
          </TabsList>
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
