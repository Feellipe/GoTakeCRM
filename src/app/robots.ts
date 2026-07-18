import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const isPortfolio = process.env.NEXT_PUBLIC_APP_MODE === 'portfolio';

  if (isPortfolio) {
    // Portfolio: permite indexacao completa para ser encontravel
    // Fallback chain: NEXTAUTH_URL -> https://VERCEL_URL -> dominio de producao
    // Necessario porque em build time (CI) ambas as env vars podem ser undefined,
    // o que tornaria `https://${process.env.VERCEL_URL}` -> "https://undefined".
    const siteUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'https://gotakecrm.vercel.app';

    return {
      rules: { userAgent: '*', allow: '/' },
      sitemap: `${siteUrl}/sitemap.xml`,
    };
  }

  // Client: bloqueia toda indexacao (dados privados do CRM)
  return {
    rules: { userAgent: '*', disallow: '/' },
  };
}
