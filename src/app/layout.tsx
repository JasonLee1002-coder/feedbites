import type { Metadata } from 'next';
import { Noto_Sans_TC, Noto_Serif_TC } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import LineBrowserGuard from '@/components/LineBrowserGuard';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import { BRAND_FULL, BRAND_ICON, BASE_PATH } from '@/lib/brand';
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

const siteUrl = `https://poc.mcstation.ai${BASE_PATH}`;

export const metadata: Metadata = {
  title: {
    default: `${BRAND_FULL} — 餐廳問卷系統｜掃碼填問卷，自動送折扣碼`,
    template: `%s | ${BRAND_FULL}`,
  },
  description: '免費餐飲問卷系統，5 種高質感模板、QR Code 掃碼填寫、XP 積分遊戲化體驗、自動發送折扣碼。讓你的餐廳問卷不再像 Google 表單。by MCS Singapore',
  keywords: [
    '餐廳問卷', '餐飲問卷系統', '顧客回饋', '免費問卷',
    'QR Code 問卷', '折扣碼', '餐廳折扣', '餐廳評價',
    '顧客滿意度調查', '餐飲回饋', BRAND_FULL,
    'restaurant survey', 'customer feedback', 'dining survey',
  ],
  openGraph: {
    title: `${BRAND_FULL} — 餐廳問卷系統｜Eat. Earn. Eat again.`,
    description: '免費餐飲問卷系統，高質感品牌問卷模板，填完自動送折扣碼。5 分鐘上線，永久免費。',
    type: 'website',
    url: siteUrl,
    siteName: BRAND_FULL,
    locale: 'zh_TW',
    images: [
      {
        url: `https://poc.mcstation.ai${BRAND_ICON}`,
        width: 1200,
        height: 630,
        alt: `${BRAND_FULL} — Eat. Earn. Eat again.`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_FULL} — 餐廳問卷系統`,
    description: '免費餐飲問卷，填完自動送折扣碼',
    images: [`https://poc.mcstation.ai${BRAND_ICON}`],
  },
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  metadataBase: new URL(siteUrl),
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: BRAND_FULL,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: BRAND_FULL,
        url: siteUrl,
        logo: `https://poc.mcstation.ai${BRAND_ICON}`,
        description: '免費餐飲問卷系統，高質感品牌問卷，填完自動送折扣碼。',
        foundingDate: '2026',
        founder: {
          '@type': 'Organization',
          name: 'MCS Pte. Ltd.',
        },
      },
      {
        '@type': 'WebSite',
        name: BRAND_FULL,
        url: siteUrl,
        description: '免費餐飲問卷系統',
        inLanguage: 'zh-Hant-TW',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/s/{search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang="zh-TW" style={{ overflowX: 'hidden' }}>
      <head>
        <meta name="theme-color" content="#DB5620" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${notoSans.variable} ${notoSerif.variable} font-sans antialiased overflow-x-hidden max-w-[100vw]`}>
        <LineBrowserGuard />
        <PwaInstallPrompt appName={BRAND_FULL} appIcon={BRAND_ICON} accentColor="#C5A55A" />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
