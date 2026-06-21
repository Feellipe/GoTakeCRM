import { db } from '@/lib/db';
import type { FlowHandler, StepResult } from './index';

/**
 * Parses a Brazilian currency string to a number.
 * Accepts formats: "5000", "1.500,50", "R$ 1.500,50", "0,01"
 */
function parseBRLValue(input: string): number | null {
  let cleaned = input.trim();

  // Remove R$ prefix
  cleaned = cleaned.replace(/^R\$\s*/i, '');

  // Handle Brazilian format: remove dots (thousands), replace comma with dot
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

const VALID_CATEGORIES = ['equipamento', 'locação', 'equipe', 'transporte', 'outro'];

/**
 * /despesa — 5-step conversational flow for registering project expenses.
 *
 * Steps:
 *   0 → Ask project ID
 *   1 → Receive ID, validate exists, ask value
 *   2 → Receive value, ask description
 *   3 → Receive description, ask category
 *   4 → Receive category, create expense
 */
export const despesaHandler: FlowHandler = {
  command: 'despesa',
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

  // Strip # prefix if present
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
    message: `Projeto: *${deal.title}*\n\nQual o valor da despesa?`,
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
    message: 'Qual a descrição da despesa?',
    nextStep: 3,
    updatedData: { ...data, amount },
  };
}

// ─── Step 3: Receive description, ask category ───────────────────
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

  const categoryList = VALID_CATEGORIES.join(', ');

  return {
    message: `Qual a categoria da despesa?\n\nCategorias disponíveis: ${categoryList}`,
    nextStep: 4,
    updatedData: { ...data, description: trimmed },
  };
}

// ─── Step 4: Receive category, create expense ────────────────────
async function handleStep4(
  input: string,
  data: Record<string, any>
): Promise<StepResult> {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed || !VALID_CATEGORIES.includes(trimmed)) {
    return {
      message:
        'Categoria inválida. As categorias disponíveis são: equipamento, locação, equipe, transporte, outro.',
      nextStep: 4,
      updatedData: {},
    };
  }

  try {
    const expense = await db.expense.create({
      data: {
        dealId: data.projectId,
        category: trimmed,
        description: data.description,
        amount: data.amount,
        currency: 'BRL',
      },
    });

    return {
      message: `✅ *Despesa registrada com sucesso!*\n\nValor: ${formatCurrency(data.amount)}\nCategoria: ${trimmed}\nDescrição: ${data.description}`,
      nextStep: null,
      updatedData: {},
      result: {
        action: 'create_expense',
        entities: { expenseId: expense.id },
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      message: `Erro ao criar despesa: ${message}`,
      nextStep: null,
      updatedData: {},
    };
  }
}
