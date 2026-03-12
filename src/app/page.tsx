import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-[#3A3A3A] font-serif">
            Feed<span className="text-[#C5A55A]">Bites</span>
          </span>
        </div>
        <Link
          href="/login"
          className="text-sm px-5 py-2 bg-[#C5A55A] text-white rounded-full hover:bg-[#A08735] transition-colors"
        >
          登入
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-block px-4 py-1 bg-[#C5A55A]/10 text-[#A08735] text-xs rounded-full mb-6 tracking-widest">
          BY MCS &middot; SINGAPORE
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-[#3A3A3A] font-serif leading-tight mb-6">
          餐廳問卷<br className="md:hidden" />不該長得像<br />
          <span className="text-[#C5A55A]">Google 表單</span>
        </h1>
        <p className="text-lg text-[#8A8585] max-w-xl mx-auto mb-4 leading-relaxed">
          FeedBites 讓你的問卷和你的餐廳一樣有質感。<br />
          客人掃碼填問卷，填完自動拿折扣碼。
        </p>
        <p className="text-sm text-[#A08735] tracking-[0.3em] mb-10 font-medium">
          Bite. Rate. Save.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-8 py-4 bg-[#C5A55A] text-white rounded-full text-lg font-semibold hover:bg-[#A08735] transition-all shadow-lg shadow-[#C5A55A]/20 hover:shadow-xl hover:shadow-[#C5A55A]/30 hover:-translate-y-0.5"
          >
            免費開通我的餐廳問卷
          </Link>
          <Link
            href="#demo"
            className="px-8 py-4 border border-[#E8E2D8] text-[#8A8585] rounded-full text-lg hover:border-[#C5A55A] hover:text-[#A08735] transition-all"
          >
            看 Demo
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: '🎨',
              title: '5 種高質感模板',
              desc: '奶油金、和風、工業風、清新、古典紅。上傳你的 Logo，問卷就是你的品牌延伸。',
            },
            {
              icon: '🎁',
              title: '填完送折扣碼',
              desc: '客人填問卷像玩遊戲，填完自動拿到專屬折扣碼。回填率提升 3 倍。',
            },
            {
              icon: '📊',
              title: '即時統計儀表板',
              desc: '每一筆回饋即時入帳，圖表化分析，隨時掌握客人的真實想法。',
            },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-8 border border-[#E8E2D8] shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-[#3A3A3A] mb-2">{f.title}</h3>
              <p className="text-sm text-[#8A8585] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-24 border-t border-[#E8E2D8]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#3A3A3A] font-serif mb-16">
            3 步驟開始
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: '01', title: '免費註冊', desc: '輸入 Email 即可開通，不綁定信用卡' },
              { step: '02', title: '選模板建問卷', desc: '選風格、傳 Logo、調整問題，5 分鐘搞定' },
              { step: '03', title: '印 QR Code 貼桌上', desc: '客人掃碼填問卷，你即時看統計' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#C5A55A]/10 text-[#C5A55A] text-2xl font-bold flex items-center justify-center mx-auto mb-4 font-serif">
                  {s.step}
                </div>
                <h3 className="text-lg font-bold text-[#3A3A3A] mb-2">{s.title}</h3>
                <p className="text-sm text-[#8A8585]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates preview */}
      <section id="demo" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center text-[#3A3A3A] font-serif mb-4">
          5 種質感模板
        </h2>
        <p className="text-center text-[#8A8585] mb-12">
          每一種都為特定餐飲風格量身打造
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { name: '奶油金', en: 'Elegant', bg: '#FAF7F2', primary: '#C5A55A', suited: '西餐 Fine Dining', id: 'fine-dining' },
            { name: '和風', en: 'Zen', bg: '#F5F0E8', primary: '#8B7355', suited: '日料 壽司', id: 'japanese' },
            { name: '工業風', en: 'Industrial', bg: '#1A1A1A', primary: '#D4A14A', suited: '酒吧 燒烤', dark: true, id: 'industrial' },
            { name: '清新', en: 'Fresh', bg: '#F8FAF5', primary: '#6B9B76', suited: '咖啡廳 輕食', id: 'cafe' },
            { name: '古典紅', en: 'Heritage', bg: '#FFF8F0', primary: '#B22222', suited: '中餐 火鍋', id: 'chinese-classic' },
          ].map((t, i) => (
            <Link
              key={i}
              href={`/register?template=${t.id}`}
              className="block rounded-2xl overflow-hidden border border-[#E8E2D8] shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
              style={{ background: t.bg }}
            >
              <div className="p-6 text-center" style={{ minHeight: 160 }}>
                <div
                  className="w-10 h-10 rounded-full mx-auto mb-3"
                  style={{ background: t.primary }}
                />
                <div className="font-bold text-lg mb-0.5" style={{ color: t.dark ? '#F0ECE0' : '#3A3A3A' }}>
                  {t.name}
                </div>
                <div className="text-xs mb-2" style={{ color: t.dark ? '#A0A0A0' : '#8A8585' }}>
                  {t.en}
                </div>
                <div className="text-xs" style={{ color: t.primary }}>
                  {t.suited}
                </div>
                <div className="mt-3 text-xs font-medium px-3 py-1 rounded-full inline-block" style={{ background: `${t.primary}15`, color: t.primary }}>
                  使用此模板 →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#3A3A3A] py-24 text-center">
        <h2 className="text-3xl font-bold text-white font-serif mb-4">
          你的餐廳值得更好的問卷
        </h2>
        <p className="text-[#A0A0A0] mb-8">
          永久免費 &middot; 不綁信用卡 &middot; 5 分鐘上線
        </p>
        <Link
          href="/register"
          className="inline-block px-8 py-4 bg-[#C5A55A] text-white rounded-full text-lg font-semibold hover:bg-[#E8D5A3] hover:text-[#3A3A3A] transition-all"
        >
          免費開通
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 text-center border-t border-[#E8E2D8]">
        <div className="text-xl font-bold text-[#3A3A3A] font-serif mb-1">
          Feed<span className="text-[#C5A55A]">Bites</span>
        </div>
        <div className="text-xs text-[#C5A55A] tracking-[0.3em] mb-4">Bite. Rate. Save.</div>
        <div className="text-xs text-[#8A8585]">
          &copy; {new Date().getFullYear()} MCS Pte. Ltd. &middot; Singapore
        </div>
      </footer>
    </div>
  );
}
