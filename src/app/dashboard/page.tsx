import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2D8] bg-white">
        <Link href="/" className="text-xl font-bold text-[#3A3A3A] font-serif">
          Feed<span className="text-[#C5A55A]">Bites</span>
        </Link>
        <span className="text-xs text-[#8A8585]">店長後台</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="text-5xl mb-6">🚧</div>
        <h1 className="text-2xl font-bold text-[#3A3A3A] font-serif mb-3">
          後台建置中
        </h1>
        <p className="text-[#8A8585] mb-8 leading-relaxed">
          問卷管理、統計儀表板、折扣碼驗證等功能即將上線。<br />
          請先確認 Supabase 資料庫已設定完成。
        </p>

        <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {[
            { icon: '📋', title: '建立問卷', desc: '選模板、加問題、設折扣', status: '即將上線' },
            { icon: '📊', title: '統計儀表板', desc: '即時查看回饋數據', status: '即將上線' },
            { icon: '🎫', title: '折扣碼驗證', desc: '驗證客人的折扣碼', status: '即將上線' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-[#E8E2D8] text-left">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="font-bold text-[#3A3A3A] text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-[#8A8585] mb-2">{item.desc}</p>
              <span className="inline-block px-2 py-0.5 bg-[#C5A55A]/10 text-[#A08735] text-xs rounded-full">
                {item.status}
              </span>
            </div>
          ))}
        </div>

        <Link
          href="/"
          className="inline-block mt-8 px-6 py-3 border border-[#E8E2D8] rounded-full text-sm text-[#8A8585] hover:border-[#C5A55A] hover:text-[#A08735] transition-colors"
        >
          回首頁
        </Link>
      </div>
    </div>
  );
}
