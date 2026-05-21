import * as Sentry from '@sentry/nextjs';

// Amostragem diferenciada por modo de operacao
// Portfolio: taxa menor (trafego publico elevado), replays de sessao desabilitados
// Client: taxa moderada (poucos usuarios), replays completos para debug
const isPortfolio = process.env.NEXT_PUBLIC_APP_MODE === 'portfolio';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: isPortfolio ? 0.05 : 0.1,
  replaysSessionSampleRate: isPortfolio ? 0 : 0.1,
  replaysOnErrorSampleRate: isPortfolio ? 0.5 : 1.0,
});
