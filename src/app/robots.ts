import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const isPortfolio = process.env.NEXT_PUBLIC_APP_MODE === 'portfolio';

  if (isPortfolio) {
    // Portfolio: permite indexacao completa para ser encontravel
    return {
      rules: { userAgent: '*', allow: '/' },
      sitemap: `${process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`}/sitemap.xml`,
    };
  }

  // Client: bloqueia toda indexacao (dados privados do CRM)
  return {
    rules: { userAgent: '*', disallow: '/' },
  };
}
