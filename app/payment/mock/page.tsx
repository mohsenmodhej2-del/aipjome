'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Order = { id: string; total: number; payment_status: string };
const format = new Intl.NumberFormat('fa-IR');

export default function MockPayment() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    void Promise.resolve().then(() => new URLSearchParams(window.location.search).get('order') ?? '').then((id) => {
      setOrderId(id);
      if (!id) return null;
      return fetch(`/api/orders/${encodeURIComponent(id)}`);
    }).then(async (response) => {
      if (!response) return null;
      const data = await response.json() as { error?: string; order?: Order };
      if (!response.ok || !data.order) throw new Error(data.error ?? 'سفارش پیدا نشد.');
      return data;
    }).then((data) => { if (data?.order) setOrder(data.order); }).catch((exception: Error) => setError(exception.message));
  }, []);
  const confirm = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payments/mock/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) });
      const data = await response.json() as { error?: string; returnUrl?: string };
      if (!response.ok) throw new Error(data.error ?? 'تأیید ناموفق بود.');
      window.location.assign(data.returnUrl!);
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'خطا'); } finally { setLoading(false); }
  };
  return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#faf6ef] p-4 text-[#1b1815]"><section className="w-full max-w-md rounded-[2rem] border border-[#e8dfd2] bg-white p-8 text-center shadow-sm"><ShieldCheck className="mx-auto h-12 w-12 text-[#1f6f5c]"/><p className="mt-5 text-sm font-bold text-[#1f6f5c]">درگاه آزمایشی همه‌چی</p><h1 className="mt-2 text-2xl font-black">تأیید پرداخت</h1>{order && <p className="mt-4 rounded-xl bg-[#f1e8dc] p-4 font-bold">مبلغ قابل پرداخت: {format.format(order.total)} تومان</p>}<p className="mt-5 text-sm leading-7 text-[#71675c]">این درگاه برای نسخهٔ آزمایشی است؛ با تأیید شما، پرداخت موفق ثبت می‌شود و به فروشگاه برمی‌گردید.</p>{error && <p className="mt-4 text-sm text-red-700">{error}</p>}<Button className="mt-6 w-full" disabled={!order || loading} onClick={() => void confirm()}><CheckCircle2 /> پرداخت را تأیید می‌کنم</Button><Link href="/" className="mt-4 block text-sm text-[#1f6f5c] underline">بازگشت بدون پرداخت</Link></section></main>;
}
