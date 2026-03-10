import type { Metadata } from 'next';
import { Noto_Sans_TC, Noto_Serif_TC } from 'next/font/google';
import './globals.css';

const notoSans = Noto_Sans_TC({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
});

const notoSerif = Noto_Serif_TC({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  title: 'FeedBites — Bite. Rate. Save.',
  description: '全球免費餐飲問卷系統，高質感品牌問卷，填完自動送折扣碼。by MCS Singapore',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${notoSans.variable} ${notoSerif.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
