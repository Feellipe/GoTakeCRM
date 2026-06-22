import { db } from '@/lib/db';
import type { FlowHandler, StepResult } from './index';

/**
 * /calendario — 2-step conversational flow for checking bookings by period.
 *
 * Steps:
 *   0 → Ask period: hoje / semana / mês
 *   1 → Filter bookings by date range and display results
 */
export const calendarioHandler: FlowHandler = {
  command: 'calendario',
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

// ─── Step 0: Ask period ─────────────────────────────────────────
function handleStep0(): StepResult {
  return {
    message: 'Qual o período? (hoje / semana / mês)',
    nextStep: 1,
    updatedData: {},
  };
}

// ─── Step 1: Filter and display ─────────────────────────────────
async function handleStep1(
  input: string,
  _data: Record<string, any>,
  organizationId: string
): Promise<StepResult> {
  const trimmed = input.trim().toLowerCase();

  let periodLabel: string;
  let gte: Date;
  let lt: Date;

  const now = new Date();

  if (trimmed === 'hoje') {
    periodLabel = 'Hoje';
    gte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    lt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (trimmed === 'semana') {
    periodLabel = 'Esta semana';
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    gte = monday;
    lt = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
  } else if (trimmed === 'mês' || trimmed === 'mes') {
    periodLabel = 'Este mês';
    gte = new Date(now.getFullYear(), now.getMonth(), 1);
    lt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else {
    return {
      message: 'Por favor, escolha um período válido: hoje, semana ou mês.',
      nextStep: 1,
      updatedData: {},
    };
  }

  const bookings = await db.booking.findMany({
    where: {
      date: {
        gte,
        lt,
      },
      organizationId,
    },
  });

  if (!bookings || bookings.length === 0) {
    return {
      message: 'Nenhum agendamento encontrado para este período.',
      nextStep: null,
      updatedData: {},
    };
  }

  const statusIcon: Record<string, string> = {
    pending: '🟡',
    confirmed: '🟢',
    completed: '✅',
  };

  const lines: string[] = [
    `📅 *Agendamentos — ${periodLabel}*`,
    '',
  ];

  bookings.forEach((booking: any) => {
    const icon = statusIcon[booking.status] || '⚪';
    const dateStr = booking.date
      ? new Date(booking.date).toLocaleDateString('pt-BR')
      : '—';
    const timeStr = booking.date
      ? new Date(booking.date).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
    lines.push(`${icon} *${booking.title}*`);
    lines.push(`   ${dateStr} ${timeStr}`);
    if (booking.notes) {
      lines.push(`   ${booking.notes}`);
    }
    lines.push('');
  });

  return {
    message: lines.join('\n').trim(),
    nextStep: null,
    updatedData: {},
  };
}
