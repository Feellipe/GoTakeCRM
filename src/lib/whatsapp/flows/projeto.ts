import { db } from '@/lib/db';
import type { FlowHandler, StepResult } from './index';

/**
 * /projeto — 2-step conversational flow for viewing full project details.
 *
 * Steps:
 *   0 → Ask project ID
 *   1 → Fetch deal with all relations and display full details
 */
export const projetoHandler: FlowHandler = {
  command: 'projeto',
  totalSteps: 2,

  async handle(
    input: string,
    data: Record<string, any>,
    step: number,
    organizationId: string
  ): Promise<StepResult> {
    try {
      switch (step) {
        case 0:
          return handleStep0();
        case 1:
          return await handleStep1(input, data, organizationId);
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

// ─── Step 1: Fetch and display full project details ──────────────
async function handleStep1(
  input: string,
  _data: Record<string, any>,
  organizationId: string
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
    where: { id: projectId, organizationId },
    include: {
      client: true,
      briefings: true,
      proposals: true,
      bookings: true,
    },
  });

  if (!deal) {
    return {
      message: 'Projeto não encontrado.',
      nextStep: 1,
      updatedData: {},
    };
  }

  const d = deal as any;
  const client = d.client;
  const briefings = d.briefings ?? [];
  const proposals = d.proposals ?? [];
  const bookings = d.bookings ?? [];

  const lines: string[] = [
    `📋 *Projeto: ${d.title}*`,
    '',
    `*ID:* ${d.id}`,
    `*Status:* ${d.status}`,
    `*Valor:* R$ ${(d.value ?? 0).toLocaleString('pt-BR')}`,
    '',
    `*Cliente:* ${client?.name ?? '—'}`,
    `*Telefone:* ${client?.phone ?? '—'}`,
    '',
  ];

  if (d.description) {
    lines.push(`*Descrição:* ${d.description}`, '');
  }

  // Briefings
  lines.push(`*Briefings (${briefings.length}):*`);
  if (briefings.length === 0) {
    lines.push('  Nenhum briefing registrado.');
  } else {
    briefings.forEach((b: any, i: number) => {
      const preview = b.content.length > 80
        ? b.content.slice(0, 80) + '...'
        : b.content;
      lines.push(`  ${i + 1}. ${preview}`);
    });
  }
  lines.push('');

  // Proposals
  lines.push(`*Propostas (${proposals.length}):*`);
  if (proposals.length === 0) {
    lines.push('  Nenhuma proposta registrada.');
  } else {
    proposals.forEach((p: any, i: number) => {
      const value = p.totalValue
        ? `R$ ${p.totalValue.toLocaleString('pt-BR')}`
        : '—';
      lines.push(`  ${i + 1}. Status: ${p.status} — ${value}`);
    });
  }
  lines.push('');

  // Bookings
  lines.push(`*Agendamentos (${bookings.length}):*`);
  if (bookings.length === 0) {
    lines.push('  Nenhum agendamento registrado.');
  } else {
    bookings.forEach((b: any, i: number) => {
      const dateStr = b.date
        ? new Date(b.date).toLocaleDateString('pt-BR')
        : '—';
      lines.push(`  ${i + 1}. ${b.title} — ${dateStr} (${b.status})`);
    });
  }

  return {
    message: lines.join('\n'),
    nextStep: null,
    updatedData: {},
  };
}
