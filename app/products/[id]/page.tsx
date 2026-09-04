'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Product = { id: string; title: string; description: string; price: number; stock: number; attributes: string; category_name: string };
type Variant = { id: string; sku: string; options: string; price: number; stock: number };
const digits = new Intl.NumberFormat('fa-IR');

export default function ProductPage() {
  const [product, setProduct] = useState<Product | null>(null); const [variants, setVariants] = useState<Variant[]>([]); const [error, setError] = useState(''); const [selected, setSelected] = useState<Variant | null>(null);
  useEffect(() => { const id = window.location.pathname.split('/').at(-1); if (!id) return; void fetch(`/api/products/${encodeURIComponent(id)}`).then(async (response) => { const data = await response.json() as { product?: Product; variants?: Variant[]; error?: string }; if (!response.ok || !data.product) throw new Error(data.error ?? 'کالا پیدا نشد.'); return data; }).then((data) => { setProduct(data.product!); setVariants(data.variants ?? []); setSelected(data.variants?.[0] ?? null); }).catch((exception: Error) => setError(exception.message)); }, []);
  if (error) return <main dir="rtl" className="p-12 text-center text-red-700">{error}</main>;
  if (!product) return <main dir="rtl" className="p-12 text-center">در حال بارگیری کالا…</main>;
  const attributes = (() => { try { return Object.entries(JSON.parse(product.attributes) as Record<string, string>); } catch { return []; } })(); const price = selected?.price ?? product.price; const stock = selected?.stock ?? product.stock;
  return <main dir="rtl" className="min-h-screen bg-[#faf6ef] p-4 text-[#1b1815] md:p-10"><article className="mx-auto grid max-w-5xl gap-8 rounded-3xl border bg-white p-6 md:grid-cols-2 md:p-10"><div className="min-h-80 rounded-2xl bg-gradient-to-bl from-[#dcebe4] via-[#f4d7ba] to-[#e8a33d]"/><div><Link href="/" className="text-sm text-[#1f6f5c] underline">بازگشت به فروشگاه</Link><p className="mt-6 text-sm font-bold text-[#1f6f5c]">{product.category_name}</p><h1 className="mt-2 text-3xl font-black text-[#14332b]">{product.title}</h1><p className="mt-5 leading-8 text-[#71675c]">{product.description}</p>{attributes.length > 0 && <dl className="mt-6 grid grid-cols-2 gap-2 text-sm">{attributes.map(([key, value]) => <div key={key} className="rounded-lg bg-[#f1e8dc] p-3"><dt className="text-[#71675c]">{key}</dt><dd className="mt-1 font-bold">{value}</dd></div>)}</dl>}{variants.length > 0 && <div className="mt-6"><p className="font-bold">تنوع کالا</p><div className="mt-2 flex flex-wrap gap-2">{variants.map((variant) => <Button key={variant.id} variant={selected?.id === variant.id ? 'default' : 'outline'} onClick={() => setSelected(variant)} disabled={variant.stock < 1}>{Object.values(JSON.parse(variant.options) as Record<string, string>).join(' · ') || variant.sku}</Button>)}</div></div>}<p className="mt-7 text-2xl font-black">{digits.format(price)} تومان</p><p className="mt-2 text-sm text-[#71675c]">{digits.format(stock)} عدد موجود</p><Button className="mt-5" disabled={stock < 1}><ShoppingCart /> افزودن به سبد از ویترین</Button></div></article></main>;
}
