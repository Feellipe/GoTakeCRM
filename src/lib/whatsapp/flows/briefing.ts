import { db } from '@/lib/db';
import type { FlowHandler, StepResult } from './index';

/**
 * /briefing — 3-step conversational flow for capturing project briefings.
 *
 * Steps:
 *   0 → Ask project ID
 *   1 → Receive briefing text, ask to confirm
 *   2 → "confirmar" → create Briefing; "cancelar" → back to step 0
 */
export const briefingHandler: FlowHandler = {
  command: 'briefing',
  totalSteps: 3,

  async handle(
    input: string,
    data: Record<string, any>,
    step: number,
    _organizationId: string
  ): Promise<StepResult> {
    try {
      switch (step) {
        case 0:
          return handleStep0();
        case 1:
          return handleStep1(input, data);
        case 2:
          return await handleStep2(input, data);
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

// ─── Step 1: Receive briefing text, ask confirm ──────────────────
async function handleStep1(
  input: string,
  data: Record<string, any>
): Promise<StepResult> {
  const trimmed = input.trim();

  if (!trimmed || trimmed.length < 1 || trimmed.length > 10000) {
    return {
      message: 'Por favor, informe o briefing (1 a 10000 caracteres).',
      nextStep: 1,
      updatedData: {},
    };
  }

  return {
    message:
      'Confirma o briefing?\n\n' +
      `${trimmed}\n\n` +
      'Digite *confirmar* para salvar ou *cancelar* para recomeçar.',
    nextStep: 2,
    updatedData: { ...data, content: trimmed },
  };
}

// ─── Step 2: Confirm or cancel ───────────────────────────────────
async function handleStep2(
  input: string,
  data: Record<string, any>
): Promise<StepResult> {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === 'confirmar') {
    try {
      const briefing = await db.briefing.create({
        data: {
          dealId: data.projectId,
          content: data.content,
          author: 'WhatsApp',
        },
      });

      return {
        message: `✅ *Briefing salvo com sucesso!*`,
        nextStep: null,
        updatedData: {},
        result: {
          action: 'create_briefing',
          entities: { briefingId: briefing.id },
        },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        message: `Erro ao criar briefing: ${message}`,
        nextStep: null,
        updatedData: {},
      };
    }
  }

  if (trimmed === 'cancelar') {
    return {
      message: 'Briefing cancelado. Vamos começar de novo.\n\nQual o ID do projeto?',
      nextStep: 0,
      updatedData: {},
    };
  }

  return {
    message:
      'Por favor, responda "confirmar" para salvar ou "cancelar" para recomeçar.',
    nextStep: 2,
    updatedData: {},
  };
}
