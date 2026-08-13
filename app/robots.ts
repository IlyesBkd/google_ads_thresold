import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.gadscale.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Nothing behind a customer session or an admin login belongs in an
        // index — and download links are single-use secrets.
        disallow: ['/admin', '/api/', '/account', '/download/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
