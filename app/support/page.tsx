'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
type Ticket = {
  id: string;
  type: string;
  status: string;
  message: string;
  response: string | null;
};
export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('question');
  const [notice, setNotice] = useState('');
  const load = async () => {
    const response = await fetch('/api/requests');
    const data = (await response.json()) as {
      requests?: Ticket[];
      error?: string;
    };
    if (!response.ok) throw new Error(data.error);
    setTickets(data.requests ?? []);
  };
  useEffect(() => {
    void Promise.resolve().then(load).catch((error: Error) => setNotice(error.message));
  }, []);
  const send = async () => {
    try {
      const orderId = new URLSearchParams(window.location.search).get('order');
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, message, orderId: orderId ?? undefined }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      setMessage('');
      setNotice('درخواست ثبت شد.');
      await load();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'ثبت درخواست انجام نشد.',
      );
    }
  };
  return (
    <main dir="rtl" className="mx-auto max-w-3xl p-6">
      <Link href="/">بازگشت به فروشگاه</Link>
      <h1 className="my-6 text-3xl font-bold">پشتیبانی و درخواست‌های من</h1>
      <div className="space-y-4 rounded-xl border bg-white p-5">
        <select
          className="w-full rounded border p-3"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="question">پرسش</option>
          <option value="return">مرجوعی</option>
          <option value="cancel">لغو سفارش</option>
          <option value="warranty">گارانتی</option>
        </select>
        <textarea
          className="min-h-32 w-full rounded border p-3"
          placeholder="شرح درخواست"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <Button
          onClick={() => void send()}
          disabled={message.trim().length < 5}
        >
          ثبت درخواست
        </Button>
        <output>{notice}</output>
      </div>
      <div className="mt-6 space-y-3">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="rounded-xl border bg-white p-5">
            <p className="text-sm">
              {ticket.type} · {ticket.status}
            </p>
            <p className="my-3 whitespace-pre-wrap">{ticket.message}</p>
            {ticket.response && (
              <p className="rounded-lg bg-green-50 p-3">
                پاسخ: {ticket.response}
              </p>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
