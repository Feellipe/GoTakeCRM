/**
 * Audit Logging para operacoes sensiveis (CRUD de clientes, deals, bookings).
 *
 * Em desenvolvimento: log estruturado no console.
 * Em producao: pronto para upgrade para banco de dados ou arquivo.
 *
 * Formato: [AUDIT] {timestamp} | {action} | {JSON details}
 */

export type AuditAction =
  | 'client:create'
  | 'client:update'
  | 'client:delete'
  | 'deal:create'
  | 'deal:update'
  | 'deal:delete'
  | 'booking:create'
  | 'booking:update'
  | 'booking:delete';

interface AuditEntry {
  timestamp: string;
  action: AuditAction;
  details: Record<string, unknown>;
}

/**
 * Registra uma acao de auditoria.
 *
 * @param action - Acao auditada (ex: 'client:create')
 * @param details - Detalhes da operacao (id, campos alterados, etc.)
 */
export function auditLog(action: AuditAction, details: Record<string, unknown>) {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    action,
    details,
  };

  const detailsJson = JSON.stringify(entry.details);
  console.log(`[AUDIT] ${entry.timestamp} | ${entry.action} | ${detailsJson}`);
}
