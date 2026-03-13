import Link from 'next/link';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import StepsSection from '@/components/landing/StepsSection';
import TemplatesSection from '@/components/landing/TemplatesSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] overflow-x-hidden">
      {/* Nav */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <img
            src="/feedbites-logo.png"
            alt="FeedBites"
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
      <footer className="py-12 px-6 text-center bg-[#2A2A2A]">
        <img
          src="/feedbites-logo.png"
          alt="FeedBites"
          className="h-10 mx-auto mb-4 object-contain"
        />
        <div className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} MCS Pte. Ltd. &middot; Singapore
        </div>
      </footer>
    </div>
  );
}
