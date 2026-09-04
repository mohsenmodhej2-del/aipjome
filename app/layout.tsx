import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'همه‌چی | فروشگاه چنددسته‌ای',
  description: 'خرید آنلاین از دسته‌های الکترونیک، پوشاک، آرایشی و سلامت با پیگیری شفاف مرسوله‌ها.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
