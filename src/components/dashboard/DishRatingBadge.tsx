'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface DishStats {
  mentions: number;
  avgRating: number | null;
}

export default function DishRatingBadge({ dishId }: { dishId: string }) {
  const [stats, setStats] = useState<DishStats | null>(null);

  useEffect(() => {
    fetch(`/feedbites/api/dishes/${dishId}/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStats(d))
      .catch(() => {});
  }, [dishId]);

  if (!stats || (stats.mentions === 0 && !stats.avgRating)) return null;

  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      {stats.avgRating !== null && (
        <span className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
          <Image src="/icons/star.png" alt="star" width={12} height={12} />
          {stats.avgRating.toFixed(1)}
        </span>
      )}
      {stats.mentions > 0 && (
        <span className="text-[10px] text-[#8A8585]">提及 {stats.mentions} 次</span>
      )}
    </div>
  );
}
