import config from '@/lib/config';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/search'] }],
    sitemap: `${config.siteUrl}/sitemap.xml`,
  };
}
