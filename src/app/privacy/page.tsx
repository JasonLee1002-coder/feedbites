import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-block mb-8">
          <span className="text-2xl font-bold text-[#3A3A3A] font-serif">
            Feed<span className="text-[#C5A55A]">Bites</span>
          </span>
        </Link>

        <h1 className="text-3xl font-bold text-[#3A3A3A] font-serif mb-8">
          隱私權政策
        </h1>

        <div className="bg-white rounded-2xl border border-[#E8E2D8] p-8 space-y-6 text-sm text-[#3A3A3A] leading-relaxed">
          <section>
            <h2 className="text-lg font-bold mb-2">資料收集</h2>
            <p className="text-[#8A8585]">
              FeedBites 僅收集提供服務所需的最少資料：
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-[#8A8585]">
              <li>店長帳號：Email、店家名稱（透過 Google 登入或 Email 註冊）</li>
              <li>問卷回覆：客人填寫的問卷答案、手機號碼（選填）</li>
              <li>折扣碼：系統自動產生的折扣碼及使用紀錄</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">資料用途</h2>
            <ul className="list-disc pl-5 space-y-1 text-[#8A8585]">
              <li>提供問卷建立、回覆收集、統計分析服務</li>
              <li>產生及管理折扣碼</li>
              <li>店長選擇啟用時，用於優惠通知</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">資料保護</h2>
            <p className="text-[#8A8585]">
              所有資料儲存於 Supabase 雲端資料庫，採用業界標準加密傳輸（TLS）及存取控制（RLS）。
              我們不會將您的資料出售或分享給第三方。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Cookie 與第三方服務</h2>
            <p className="text-[#8A8585]">
              FeedBites 使用 Supabase Auth 管理登入狀態，可能使用 Google OAuth 進行身份驗證。
              我們不使用追蹤型 Cookie 或廣告追蹤。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">資料刪除</h2>
            <p className="text-[#8A8585]">
              如需刪除帳號或相關資料，請聯繫我們，我們將在 30 天內處理您的請求。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">聯絡方式</h2>
            <p className="text-[#8A8585]">
              MCS Pte. Ltd. &middot; Singapore
            </p>
          </section>

          <div className="pt-4 border-t border-[#E8E2D8] text-xs text-[#8A8585]">
            最後更新：2026 年 3 月
          </div>
        </div>
      </div>
    </div>
  );
}
