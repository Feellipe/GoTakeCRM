import { db } from '@/lib/db';
import type { FlowHandler, StepResult } from './index';

/**
 * /pacotes — 2-step conversational flow for listing packages.
 *
 * Steps:
 *   0 → Ask "Ativos ou todos?"
 *   1 → Filter packages and display results
 */
export const pacotesHandler: FlowHandler = {
  command: 'pacotes',
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

// ─── Step 0: Ask filter ─────────────────────────────────────────
function handleStep0(): StepResult {
  return {
    message: 'Quer ver pacotes ativos ou todos? (ativos/todos)',
    nextStep: 1,
    updatedData: {},
  };
}

// ─── Step 1: Filter and display packages ────────────────────────
async function handleStep1(
  input: string,
  _data: Record<string, any>
): Promise<StepResult> {
  const trimmed = input.trim().toLowerCase();

  let where: Record<string, any> = {};

  if (trimmed === 'ativos' || trimmed === 'ativo') {
    where = { active: true };
  } else if (trimmed === 'todos' || trimmed === 'todas' || trimmed === 'all') {
    where = {};
  } else {
    return {
      message: 'Por favor, responda "ativos" ou "todos".',
      nextStep: 1,
      updatedData: {},
    };
  }

  const packages = await db.package.findMany({
    where,
  });

  if (!packages || packages.length === 0) {
    return {
      message: 'Nenhum pacote cadastrado.',
      nextStep: null,
      updatedData: {},
    };
  }

  const label = trimmed === 'ativos' || trimmed === 'ativo'
    ? 'Pacotes Ativos'
    : 'Todos os Pacotes';

  const lines: string[] = [
    `📦 *${label}*`,
    '',
  ];

  packages.forEach((pkg: any, index: number) => {
    const value = pkg.value
      ? `R$ ${pkg.value.toLocaleString('pt-BR')}`
      : '—';
    const status = pkg.active ? '✅ Ativo' : '❌ Inativo';
    lines.push(`*${index + 1}. ${pkg.name}*`);
    lines.push(`   Valor: ${value}`);
    lines.push(`   Status: ${status}`);
    if (pkg.description) {
      const desc =
        pkg.description.length > 100
          ? pkg.description.slice(0, 100) + '...'
          : pkg.description;
      lines.push(`   ${desc}`);
    }
    lines.push('');
  });

  return {
    message: lines.join('\n').trim(),
    nextStep: null,
    updatedData: {},
  };
}
