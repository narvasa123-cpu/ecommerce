import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { appUrl } from '@/lib/security';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({
    where: { active: true },
    select: { slug: true, createdAt: true },
  });
  return [
    ...[
      '',
      '/collections',
      '/story',
      '/shipping',
      '/returns',
      '/care',
      '/contact',
      '/privacy',
      '/terms',
    ].map((path) => ({
      url: appUrl() + path,
      changeFrequency: 'monthly' as const,
      priority: path === '' ? 1 : 0.6,
    })),
    ...products.map((p) => ({
      url: appUrl() + '/products/' + p.slug,
      lastModified: p.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
