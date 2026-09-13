import type { MetadataRoute } from 'next';
import { BASE_PATH } from '@/lib/brand';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/'],
    },
    sitemap: `https://poc.mcstation.ai${BASE_PATH}/sitemap.xml`,
  };
}
