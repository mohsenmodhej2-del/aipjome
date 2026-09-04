'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
type Ticket = {
  id: string;
  message: string;
  status: string;
  type: string;
  response: string | null;
};
export default function Inbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notice, setNotice] = useState('');
  const load = async () => {
    const response = await fetch('/api/admin/requests');
    const data = (await response.json()) as {
      requests?: Ticket[];
      error?: string;
    };
    if (!response.ok) throw new Error(data.error);
    setTickets(data.requests ?? []);
  };
  useEffect(() => {
    void Promise.resolve().then(load).catch((e: Error) => setNotice(e.message));
  }, []);
  return (
    <main dir="rtl" className="mx-auto max-w-4xl p-6">
      <Link href="/admin">بازگشت به مدیریت</Link>
      <h1 className="my-6 text-3xl font-bold">صندوق درخواست‌ها</h1>
      <output>{notice}</output>
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Reply
            key={ticket.id}
            ticket={ticket}
            saved={() => void load()}
            notify={setNotice}
          />
        ))}
        {!tickets.length && <p>درخواستی برای رسیدگی وجود ندارد.</p>}
      </div>
    </main>
  );
}
function Reply({
  ticket,
  saved,
  notify,
}: {
  ticket: Ticket;
  saved: () => void;
  notify: (value: string) => void;
}) {
  const [response, setResponse] = useState(ticket.response ?? '');
  const [status, setStatus] = useState('resolved');
  const send = async () => {
    try {
      const result = await fetch('/api/admin/requests', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: ticket.id, response, status }),
      });
      const data = (await result.json()) as { error?: string };
      if (!result.ok) throw new Error(data.error);
      notify('پاسخ ثبت شد.');
      saved();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'خطا');
    }
  };
  return (
    <article className="space-y-3 rounded-xl border bg-white p-5">
      <p>
        {ticket.type} · {ticket.status}
      </p>
      <p className="whitespace-pre-wrap">{ticket.message}</p>
      <textarea
        className="min-h-24 w-full rounded border p-3"
        placeholder="پاسخ به مشتری"
        value={response}
        onChange={(e) => setResponse(e.target.value)}
      />
      <select
        className="rounded border p-2"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="resolved">پاسخ داده شد</option>
        <option value="in_progress">در حال رسیدگی</option>
        <option value="rejected">رد درخواست</option>
      </select>
      <Button
        className="mr-3"
        disabled={!response.trim()}
        onClick={() => void send()}
      >
        ثبت پاسخ
      </Button>
    </article>
  );
}
