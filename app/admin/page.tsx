'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type User = { id: string; name: string; email: string; role: string };
type Category = { id: string; name: string; path?: string };
type Assignment = {
  id: string;
  user_id: string;
  user_name: string;
  category_id: string;
  category_name: string;
};
type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  status: string;
  payment_status: string;
};
const format = new Intl.NumberFormat('fa-IR');

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set('content-type', 'application/json');
  const response = await fetch(url, { ...options, headers });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'خطا در انجام عملیات');
  return payload;
}

export default function AdminPage() {
  const [me, setMe] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notice, setNotice] = useState('');
  const load = async () => {
    try {
      const current = await api<{ user: User | null }>('/api/me');
      setMe(current.user);
      if (current.user?.role === 'super_admin') {
        const [summary, access, allOrders] = await Promise.all([
          api<{ categories: Category[] }>('/api/admin/summary'),
          api<{ users: User[]; assignments: Assignment[] }>(
            '/api/admin/access',
          ),
          api<{ orders: Order[] }>('/api/admin/orders'),
        ]);
        setCategories(summary.categories);
        setUsers(access.users);
        setAssignments(access.assignments);
        setOrders(allOrders.orders);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'خطا');
    }
  };
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);
  const submit = async (
    event: SubmitEvent & { currentTarget: HTMLFormElement },
    url: string,
    success: string,
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await api(url, {
        method: 'POST',
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      });
      setNotice(success);
      form.reset();
      void load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'خطا');
    }
  };
  if (!me)
    return (
      <main dir="rtl" className="p-10 text-center">
        برای ورود به پنل مدیریت، ابتدا وارد حساب شوید.
      </main>
    );
  if (me.role !== 'super_admin')
    return (
      <main dir="rtl" className="p-10 text-center">
        این پنل برای مدیر کل است. ادمین دسته فقط داده‌های دامنهٔ خود را در پنل
        عملیاتی می‌بیند.
      </main>
    );
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#faf6ef] p-4 text-[#1b1815] md:p-8"
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-bold text-[#1f6f5c]">مدیر کل</p>
            <Link href="/admin/requests" className="mx-4 underline">صندوق درخواست‌ها</Link>
            <Link href="/admin/catalog" className="mx-4 underline">کاتالوگ و موجودی</Link>
            <h1 className="text-3xl font-black text-[#14332b]">
              مرکز مدیریت همه‌چی
            </h1>
          </div>
          <Link className="rounded-md border px-4 py-2 text-sm" href="/">
            بازگشت به فروشگاه
          </Link>
        </header>
        {notice && (
          <p className="mt-5 rounded-xl bg-[#14332b] p-3 text-sm text-white">
            {notice}
          </p>
        )}
        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <Panel title="ساخت ادمین دسته">
            <form
              className="space-y-3"
              onSubmit={(e) =>
                void submit(
                  e as unknown as SubmitEvent & {
                    currentTarget: HTMLFormElement;
                  },
                  '/api/admin/access',
                  'ادمین ساخته شد.',
                )
              }
            >
              <input type="hidden" name="action" value="create_admin" />
              <Input name="name" placeholder="نام ادمین" required />
              <Input name="email" type="email" placeholder="ایمیل" required />
              <Input
                name="password"
                type="password"
                minLength={10}
                placeholder="رمز اولیه (حداقل ۱۰ کاراکتر)"
                required
              />
              <Button type="submit">ساخت ادمین</Button>
            </form>
          </Panel>
          <Panel title="انتساب دامنه">
            <form
              className="space-y-3"
              onSubmit={(e) =>
                void submit(
                  e as unknown as SubmitEvent & {
                    currentTarget: HTMLFormElement;
                  },
                  '/api/admin/access',
                  'دسترسی ثبت شد.',
                )
              }
            >
              <input type="hidden" name="action" value="assign" />
              <select
                name="userId"
                className="h-10 w-full rounded-md border px-3"
                required
              >
                <option value="">انتخاب ادمین</option>
                {users
                  .filter((user) => user.role === 'category_admin')
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} — {user.email}
                    </option>
                  ))}
              </select>
              <select
                name="categoryId"
                className="h-10 w-full rounded-md border px-3"
                required
              >
                <option value="">انتخاب دسته</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Button type="submit">ثبت انتساب</Button>
            </form>
          </Panel>
          <Panel title="ساخت دسته یا زیردسته">
            <form
              className="space-y-3"
              onSubmit={(e) =>
                void submit(
                  e as unknown as SubmitEvent & {
                    currentTarget: HTMLFormElement;
                  },
                  '/api/admin/categories',
                  'دسته ساخته شد.',
                )
              }
            >
              <Input name="name" placeholder="نام دسته" required />
              <Input
                name="slug"
                placeholder="slug انگلیسی مثل mens-clothing"
                required
              />
              <select
                name="parentId"
                className="h-10 w-full rounded-md border px-3"
              >
                <option value="">بدون والد (دستهٔ اصلی)</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input name="requiresApproval" type="checkbox" value="true" />{' '}
                انتشار کالا نیازمند تأیید مدیر کل باشد
              </label>
              <Button type="submit">ساخت دسته</Button>
            </form>
          </Panel>
          <Panel title="ماتریس انتساب فعلی">
            <div className="space-y-2 text-sm">
              {assignments.map((assignment) => (
                <p key={assignment.id} className="rounded-lg bg-[#f1e8dc] p-3">
                  {assignment.user_name} ← {assignment.category_name}
                </p>
              ))}
              {!assignments.length && (
                <p className="text-[#71675c]">هنوز انتسابی وجود ندارد.</p>
              )}
            </div>
          </Panel>
        </section>
        <section className="mt-6 rounded-2xl border bg-white p-5">
          <h2 className="text-xl font-black">همهٔ سفارش‌ها و فاکتورها</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-170 text-right text-sm">
              <thead className="border-b">
                <tr>
                  <th className="p-3">سفارش</th>
                  <th className="p-3">مشتری</th>
                  <th className="p-3">مبلغ</th>
                  <th className="p-3">پرداخت</th>
                  <th className="p-3">فاکتور</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b">
                    <td className="p-3">{order.id.slice(0, 8)}</td>
                    <td className="p-3">
                      {order.customer_name}
                      <br />
                      <small>{order.customer_email}</small>
                    </td>
                    <td className="p-3">{format.format(order.total)} تومان</td>
                    <td className="p-3">{order.payment_status}</td>
                    <td className="p-3">
                      <a
                        className="text-[#1f6f5c] underline"
                        href={`/invoice/${order.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        مشاهده و چاپ
                      </a>
                    </td>
                  </tr>
                ))}
                {!orders.length && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[#71675c]">
                      هنوز سفارشی نیست.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="mb-4 text-lg font-black">{title}</h2>
      {children}
    </section>
  );
}
