import type { Metadata } from 'next';
import Link from 'next/link';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import StepsSection from '@/components/landing/StepsSection';
import TemplatesSection from '@/components/landing/TemplatesSection';

export const metadata: Metadata = {
  title: 'FeedBites — 免費餐廳問卷系統｜掃碼填問卷，自動送折扣碼',
  description: '餐廳問卷不該長得像 Google 表單。FeedBites 提供 5 種高質感模板、QR Code 掃碼、XP 遊戲化體驗、自動折扣碼。免費註冊，5 分鐘上線。',
  alternates: {
    canonical: 'https://feedbites-seven.vercel.app',
  },
  openGraph: {
    title: 'FeedBites — 免費餐廳問卷系統｜Bite. Rate. Save.',
    description: '高質感餐飲問卷，填完自動送折扣碼。5 種模板、QR Code 列印、即時數據分析。永久免費。',
    url: 'https://feedbites-seven.vercel.app',
  },
};

const faqData = [
  {
    question: 'FeedBites 是什麼？',
    answer: 'FeedBites 是一款免費的餐飲問卷系統，讓餐廳老闆可以建立有質感的品牌問卷，客人掃 QR Code 即可填寫，填完自動獲得折扣碼。支援 5 種模板、XP 積分、菜品評分等功能。',
  },
  {
    question: 'FeedBites 要收費嗎？',
    answer: 'FeedBites 目前完全免費，不需要綁定信用卡。註冊後即可建立問卷、收集回覆、查看統計數據。',
  },
  {
    question: '客人怎麼填寫問卷？',
    answer: '餐廳老闆只需列印 QR Code 放在桌上或櫃台，客人用手機掃碼就能填寫問卷，不需要下載任何 App。填完還能自動獲得折扣碼。',
  },
  {
    question: 'FeedBites 支援哪些問卷模板？',
    answer: 'FeedBites 提供 5 種專為不同餐飲風格設計的模板：奶油金（西餐 Fine Dining）、和風（日料壽司）、工業風（酒吧燒烤）、清新（咖啡廳輕食）、古典紅（中餐火鍋）。',
  },
  {
    question: '可以管理多家分店嗎？',
    answer: '可以。FeedBites 支援多店管理，一個帳號可以管理多家餐廳，每家店有獨立的問卷、數據和設定。',
  },
];

export default function LandingPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FeedBites',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: '免費餐飲問卷系統，高質感品牌問卷，填完自動送折扣碼。',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '50',
    },
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />

      {/* Nav */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <img
            src="/feedbites-logo.png"
            alt="FeedBites — 免費餐廳問卷系統"
            className="h-10 object-contain"
          />
        </div>
        <Link
          href="/login"
          className="text-sm px-5 py-2 bg-[#FF8C00] text-white rounded-full hover:bg-[#E07800] transition-colors shadow-md shadow-[#FF8C00]/20"
        >
          登入
        </Link>
      </nav>

      <HeroSection />
      <FeaturesSection />
      <StepsSection />
      <TemplatesSection />

      {/* FAQ Section — visible content for SEO */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center text-[#3A3A3A] font-serif mb-12">
          常見問題
        </h2>
        <div className="space-y-4">
          {faqData.map((faq, i) => (
            <details
              key={i}
              className="bg-white rounded-2xl border border-[#E8E2D8] overflow-hidden group"
            >
              <summary className="px-6 py-5 cursor-pointer text-[#3A3A3A] font-bold hover:text-[#FF8C00] transition-colors list-none flex items-center justify-between">
                <span>{faq.question}</span>
                <span className="text-[#FF8C00] text-xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 text-sm text-[#8A8585] leading-relaxed">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-gradient-to-br from-[#FF8C00] to-[#FF6B00] py-24 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-full" />
          <div className="absolute bottom-10 right-20 w-48 h-48 border-2 border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-20 h-20 border-2 border-white rounded-full" />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white font-serif mb-4">
            你的餐廳值得更好的問卷
          </h2>
          <p className="text-white/70 mb-8 text-lg">
            永久免費 &middot; 不綁信用卡 &middot; 5 分鐘上線
          </p>
          <Link
            href="/register"
            className="inline-block px-10 py-4 bg-white text-[#FF8C00] rounded-full text-lg font-bold hover:shadow-2xl hover:shadow-white/30 hover:-translate-y-1 transition-all"
          >
            免費開通
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#2A2A2A]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <img
              src="/feedbites-logo.png"
              alt="FeedBites"
              className="h-10 mx-auto mb-4 object-contain"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/40 mb-6">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">隱私權政策</Link>
            <Link href="/login" className="hover:text-white/60 transition-colors">登入</Link>
            <Link href="/register" className="hover:text-white/60 transition-colors">免費註冊</Link>
          </div>
          <div className="text-xs text-white/30 text-center">
            &copy; {new Date().getFullYear()} MCS Pte. Ltd. &middot; Singapore
          </div>
        </div>
      </footer>
    </div>
  );
}
