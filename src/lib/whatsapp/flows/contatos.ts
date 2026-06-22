import { db } from '@/lib/db';
import type { FlowHandler, StepResult } from './index';

/**
 * /contatos — 3-step conversational flow for searching contacts.
 *
 * Steps:
 *   0 → Ask search term
 *   1 → Validate search term (min 3 chars, max 50) and search DB
 *   2 → Format and return results (auto-complete after search)
 */
export const contatosHandler: FlowHandler = {
  command: 'contatos',
  totalSteps: 3,

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
          return await handleStep1(input, data);
        case 2:
          return await handleStep2(data, organizationId);
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

// ─── Step 0: Ask search term ─────────────────────────────────────
function handleStep0(): StepResult {
  return {
    message: 'Qual o termo de busca? (mínimo 3 caracteres)',
    nextStep: 1,
    updatedData: {},
  };
}

// ─── Step 1: Validate and search ─────────────────────────────────
async function handleStep1(
  input: string,
  data: Record<string, any>
): Promise<StepResult> {
  const trimmed = input.trim();

  if (!trimmed || trimmed.length < 3 || trimmed.length > 50) {
    return {
      message: 'Por favor, informe um termo de busca com pelo menos 3 caracteres.',
      nextStep: 1,
      updatedData: {},
    };
  }

  return {
    message: 'Buscando contatos...',
    nextStep: 2,
    updatedData: { ...data, searchTerm: trimmed },
  };
}

// ─── Step 2: Search DB and display results ───────────────────────
async function handleStep2(
  data: Record<string, any>,
  organizationId: string
): Promise<StepResult> {
  const term = data.searchTerm as string;

  const clients = await db.client.findMany({
    where: {
      OR: [
        { name: { contains: term } },
        { phone: { contains: term } },
      ],
      organizationId,
    },
  });

  if (!clients || clients.length === 0) {
    return {
      message: 'Nenhum contato encontrado.',
      nextStep: null,
      updatedData: {},
    };
  }

  // Build result lines
  const lines: string[] = [];
  const top5 = clients.slice(0, 5);

  top5.forEach((client: any, index: number) => {
    const statusIcon = client.active ? '✅ Ativo' : '❌ Inativo';
    lines.push(`#C${index + 1} — ${client.name} — ${client.phone} ${statusIcon}`);
  });

  if (clients.length > 5) {
    const remaining = clients.length - 5;
    lines.push('', `e mais ${remaining} resultado${remaining > 1 ? 's' : ''}`);
  }

  return {
    message: lines.join('\n'),
    nextStep: null,
    updatedData: {},
  };
}
