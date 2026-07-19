import { db } from '@/lib/db';

/**
 * Vercel Cron — Keep-Alive para Supabase free tier
 * ================================================
 * Acionado via Vercel Cron a cada 5 dias para evitar pausa por inatividade
 * do projeto Supabase DEV (free tier pausa após 7 dias sem atividade).
 *
 * Esta rota NÃO está documentada publicamente e é protegida pelo header
 * `x-vercel-cron` que o Vercel automaticamente injeta em chamadas de cron.
 */

export async function GET(req: Request) {
  // Só executa se for chamado pelo Vercel Cron
  const isVercelCron = req.headers.get('x-vercel-cron') === 'true';

  if (!isVercelCron) {
    return new Response(
      JSON.stringify({ error: 'Not a Vercel Cron request' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Ping mínimo — SELECT 1 para checar conectividade
    const start = Date.now();
    await db.$queryRawUnsafe('SELECT 1');
    const latencyMs = Date.now() - start;

    console.log(`[cron/keep-alive] Ping OK — ${latencyMs}ms`);

    return new Response(
      JSON.stringify({
        ok: true,
        ping: 'SELECT 1',
        latencyMs,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[cron/keep-alive] Ping FAILED:', error.message);

    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
