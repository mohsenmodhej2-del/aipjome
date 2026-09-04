'use client';

import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Invoice = { number: string; issuedAt: string; store: { name: string; note: string }; order: { id: string; total: number; shippingAddress: string }; customer: { name: string; email: string }; items: { title: string; quantity: number; unit_price: number }[] };
const digits = new Intl.NumberFormat('fa-IR');

export default function InvoicePage() {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { const id = window.location.pathname.split('/').at(-1); if (!id) return; void fetch(`/api/orders/${encodeURIComponent(id)}/invoice`).then(async (response) => { const result = await response.json() as { invoice?: Invoice; error?: string }; if (!response.ok || !result.invoice) throw new Error(result.error ?? 'فاکتور پیدا نشد.'); return result.invoice; }).then(setInvoice).catch((exception: Error) => setError(exception.message)); }, []);
  if (error) return <main dir="rtl" className="p-10 text-center text-red-700">{error}</main>;
  if (!invoice) return <main dir="rtl" className="p-10 text-center">در حال آماده‌سازی فاکتور…</main>;
  return <main dir="rtl" className="min-h-screen bg-[#faf6ef] p-4 text-[#1b1815] md:p-10"><article className="mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm md:p-10"><div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6"><div><h1 className="text-3xl font-black text-[#14332b]">{invoice.store.name}</h1><p className="mt-2 text-sm text-[#71675c]">فاکتور شمارهٔ {invoice.number}</p></div><Button className="print:hidden" onClick={() => window.print()}><Printer /> چاپ فاکتور</Button></div><div className="grid gap-5 border-b py-6 text-sm md:grid-cols-2"><div><b>خریدار</b><p className="mt-2">{invoice.customer.name}</p><p>{invoice.customer.email}</p></div><div><b>ارسال به</b><p className="mt-2 leading-7">{invoice.order.shippingAddress}</p></div></div><div className="py-6"><table className="w-full text-right text-sm"><thead className="border-b text-[#71675c]"><tr><th className="pb-3">کالا</th><th className="pb-3">تعداد</th><th className="pb-3">قیمت واحد</th><th className="pb-3">جمع</th></tr></thead><tbody>{invoice.items.map((item) => <tr key={item.title} className="border-b"><td className="py-4">{item.title}</td><td>{digits.format(item.quantity)}</td><td>{digits.format(item.unit_price)} تومان</td><td>{digits.format(item.quantity * item.unit_price)} تومان</td></tr>)}</tbody></table><div className="mt-6 flex justify-between text-lg font-black"><span>مبلغ نهایی</span><span>{digits.format(invoice.order.total)} تومان</span></div></div><p className="rounded-xl bg-[#f1e8dc] p-3 text-xs text-[#71675c]">{invoice.store.note}</p></article></main>;
}
