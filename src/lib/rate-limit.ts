/**
 * Rate Limiter em memoria para protecao de rotas API.
 * Rastreia requisicoes por IP + rota usando um Map.
 *
 * DEFAULT: 100 requisicoes por 60 segundos por rota por IP
 * AUTH:    5 requisicoes por 60 segundos
 * MUTATION: 20 requisicoes por 60 segundos
 */
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Numero maximo de requisicoes na janela */
  limit?: number;
  /** Janela de tempo em milissegundos */
  windowMs?: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpeza periodica de entradas expiradas (a cada 60 segundos)
const CLEANUP_INTERVAL = 60_000;

let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Retorna o IP do cliente a partir de headers padrao.
 * Prioriza x-forwarded-for (proxies/Vercel), depois x-real-ip.
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}

/**
 * Verifica se a requisicao esta dentro do limite de taxa.
 * Retorna um objeto com success (boolean) e remaining (numero de chamadas restantes).
 *
 * @param request - NextRequest da rota API
 * @param options - Opcoes de configuracao (limite e janela)
 * @returns { success: boolean; remaining: number; limit: number; resetAt: number }
 */
export function rateLimit(
  request: NextRequest,
  options?: RateLimitOptions
): { success: boolean; remaining: number; limit: number; resetAt: number } {
  const limit = options?.limit ?? 100;
  const windowMs = options?.windowMs ?? 60_000;
  const ip = getClientIP(request);
  const route = request.nextUrl.pathname;
  const key = `${ip}:${route}`;

  cleanupExpiredEntries();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Primeira requisicao ou janela expirada
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, limit, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, limit, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count, limit, resetAt: entry.resetAt };
}

/**
 * Retorna uma resposta 429 (Too Many Requests) com header Retry-After.
 * Usa o campo resetAt retornado pelo rateLimit para calcular o tempo de espera.
 */
export function rateLimitResponse(resetAt?: number): NextResponse {
  const retryAfterSeconds = resetAt
    ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
    : 60;

  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}
