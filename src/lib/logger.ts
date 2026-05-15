/**
 * Logger estruturado para desenvolvimento e producao.
 *
 * Em desenvolvimento: saida colorida no console com timestamp.
 * Em producao: saida JSON estruturada para ingestao por sistemas de log.
 *
 * Uso:
 *   import { logger } from '@/lib/logger';
 *   logger.info('Operacao concluida', { userId: 'abc' });
 *   logger.error('Falha ao processar', { error: err.message });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data ? { data } : {}),
  };

  if (process.env.NODE_ENV === 'development') {
    const color = {
      debug: '\x1b[36m',
      info: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
    }[level];
    const formatted = `${color}[${level.toUpperCase()}]\x1b[0m ${entry.timestamp} ${message}`;
    console.log(formatted, data || '');
  } else {
    // Producao: saida JSON para sistemas de log (Vercel Logs, Datadog, etc.)
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
};
