import type { MetadataRoute } from 'next';

const baseUrl = 'https://feedbites-seven.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    // Shadow SEO pages will be added here as they're created
    // {
    //   url: `${baseUrl}/blog/${slug}`,
    //   lastModified: new Date(post.date),
    //   changeFrequency: 'monthly',
    //   priority: 0.6,
    // },
  ];
}
