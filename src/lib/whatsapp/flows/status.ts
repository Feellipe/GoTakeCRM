import { db } from '@/lib/db';
import type { FlowHandler, StepResult } from './index';

/**
 * Formats a currency number for display.
 */
function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR')}`;
}

/**
 * /status — 2-step conversational flow for checking project status.
 *
 * Steps:
 *   0 → Ask project ID
 *   1 → Fetch deal + client + briefing + proposal + expenses + revenue
 *       Show summary: nome, status, briefing ✅❌, proposta ✅❌, expenses, revenue
 */
export const statusHandler: FlowHandler = {
  command: 'status',
  totalSteps: 2,

  async handle(
    input: string,
    data: Record<string, any>,
    step: number
  ): Promise<StepResult> {
    try {
      switch (step) {
        case 0:
          return handleStep0();
        case 1:
          return await handleStep1(input, data);
        default:
          return {
            message: 'Erro: passo inválido.',
            nextStep: null,
            updatedData: {},
          };
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        message: `Erro ao processar: ${message}`,
        nextStep: null,
        updatedData: {},
      };
    }
  },
};

// ─── Step 0: Ask project ID ──────────────────────────────────────
function handleStep0(): StepResult {
  return {
    message: 'Qual o ID do projeto?',
    nextStep: 1,
    updatedData: {},
  };
}

// ─── Step 1: Fetch and display status summary ────────────────────
async function handleStep1(
  input: string,
  data: Record<string, any>
): Promise<StepResult> {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      message: 'Por favor, informe um ID de projeto válido.',
      nextStep: 1,
      updatedData: {},
    };
  }

  const projectId = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;

  const deal = await db.deal.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      briefings: true,
      proposals: true,
      expenses: true,
      revenue: true,
    },
  });

  if (!deal) {
    return {
      message: 'Projeto não encontrado.',
      nextStep: 1,
      updatedData: {},
    };
  }

  // Build status summary
  const clientName = (deal as any).client?.name ?? '—';
  const hasBriefing = (deal as any).briefings?.length > 0;
  const hasProposal = (deal as any).proposals?.length > 0;

  const totalExpenses = ((deal as any).expenses ?? []).reduce(
    (sum: number, e: any) => sum + e.amount,
    0
  );
  const totalReceived = ((deal as any).revenue ?? [])
    .filter((r: any) => r.status === 'received')
    .reduce((sum: number, r: any) => sum + r.amount, 0);
  const totalPending = ((deal as any).revenue ?? [])
    .filter((r: any) => r.status === 'pending')
    .reduce((sum: number, r: any) => sum + r.amount, 0);

  const lines: string[] = [
    `📊 *Status do Projeto*`,
    '',
    `Projeto: *${deal.title}*`,
    `Cliente: ${clientName}`,
    `Status: ${deal.status}`,
    '',
    `Briefing: ${hasBriefing ? '✅' : '❌'}`,
    `Proposta: ${hasProposal ? '✅' : '❌'}`,
    '',
    `Despesas: ${formatCurrency(totalExpenses)}`,
    `Recebido: ${formatCurrency(totalReceived)}`,
    `Pendente: ${formatCurrency(totalPending)}`,
  ];

  return {
    message: lines.join('\n'),
    nextStep: null,
    updatedData: {},
  };
}
