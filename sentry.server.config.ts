import * as Sentry from '@sentry/nextjs';

// Amostragem diferenciada por modo de operacao (server-side)
const isPortfolio = process.env.APP_MODE === 'portfolio';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: isPortfolio ? 0.05 : 0.1,
});
