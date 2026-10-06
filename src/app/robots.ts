import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/security';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/account', '/cart', '/checkout', '/orders'],
    },
    sitemap: appUrl() + '/sitemap.xml',
  };
}
