import { db } from '@/lib/db';
import type { FlowHandler, StepResult } from './index';

/**
 * Parses a Brazilian currency string to a number.
 */
function parseBRLValue(input: string): number | null {
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^R\$\s*/i, '');
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  if (isNaN(value)) return null;
  return value;
}

/**
 * Formats a currency number for display.
 */
function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR')}`;
}

const VALID_STATUSES = ['recebido', 'pendente'];

const STATUS_MAP: Record<string, string> = {
  recebido: 'received',
  pendente: 'pending',
};

/**
 * /receita — 5-step conversational flow for registering project revenue.
 *
 * Steps:
 *   0 → Ask project ID
 *   1 → Receive ID, validate exists, ask value
 *   2 → Receive value, ask description
 *   3 → Receive description, ask status (recebido/pendente)
 *   4 → Receive status, create revenue
 */
export const receitaHandler: FlowHandler = {
  command: 'receita',
  totalSteps: 5,

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
        case 2:
          return handleStep2(input, data);
        case 3:
          return handleStep3(input, data);
        case 4:
          return await handleStep4(input, data);
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

// ─── Step 1: Receive ID, validate exists, ask value ──────────────
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
  });

  if (!deal) {
    return {
      message: 'Projeto não encontrado. Verifique o ID e tente novamente.',
      nextStep: 1,
      updatedData: {},
    };
  }

  return {
    message: `Projeto: *${deal.title}*\n\nQual o valor da receita?`,
    nextStep: 2,
    updatedData: { projectId: deal.id },
  };
}

// ─── Step 2: Receive value, ask description ──────────────────────
function handleStep2(
  input: string,
  data: Record<string, any>
): StepResult {
  const amount = parseBRLValue(input);

  if (amount === null || amount <= 0) {
    return {
      message: 'Por favor, informe um valor válido maior que zero.',
      nextStep: 2,
      updatedData: {},
    };
  }

  return {
    message: 'Qual a descrição da receita?',
    nextStep: 3,
    updatedData: { ...data, amount },
  };
}

// ─── Step 3: Receive description, ask status ─────────────────────
function handleStep3(
  input: string,
  data: Record<string, any>
): StepResult {
  const trimmed = input.trim();

  if (!trimmed || trimmed.length < 1 || trimmed.length > 500) {
    return {
      message: 'Por favor, informe uma descrição (1 a 500 caracteres).',
      nextStep: 3,
      updatedData: {},
    };
  }

  return {
    message: 'A receita foi recebida ou está pendente? (recebido/pendente)',
    nextStep: 4,
    updatedData: { ...data, description: trimmed },
  };
}

// ─── Step 4: Receive status, create revenue ──────────────────────
async function handleStep4(
  input: string,
  data: Record<string, any>
): Promise<StepResult> {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed || !VALID_STATUSES.includes(trimmed)) {
    return {
      message:
        'Status inválido. A receita foi recebida ou está pendente? (recebido/pendente)',
      nextStep: 4,
      updatedData: {},
    };
  }

  try {
    const dbStatus = STATUS_MAP[trimmed];
    const revenue = await db.revenue.create({
      data: {
        dealId: data.projectId,
        description: data.description,
        amount: data.amount,
        currency: 'BRL',
        status: dbStatus,
      },
    });

    return {
      message: `✅ *Receita registrada com sucesso!*\n\nValor: ${formatCurrency(data.amount)}\nStatus: ${trimmed}\nDescrição: ${data.description}`,
      nextStep: null,
      updatedData: {},
      result: {
        action: 'create_revenue',
        entities: { revenueId: revenue.id },
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      message: `Erro ao criar receita: ${message}`,
      nextStep: null,
      updatedData: {},
    };
  }
}
