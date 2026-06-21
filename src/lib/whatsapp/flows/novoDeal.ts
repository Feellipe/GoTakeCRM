import { db } from '@/lib/db';
import type { FlowHandler, StepResult } from './index';

/**
 * Strips all non-digit characters from a phone string.
 */
function stripPhone(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Formats a currency number for display.
 */
function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR')}`;
}

/**
 * /novoDeal — 7-step conversational flow for creating a new deal.
 *
 * Steps:
 *   0 → Ask client name
 *   1 → Receive name, ask phone
 *   2 → Receive phone, list packages
 *   3 → Select package, ask if edit
 *   4 → Edit package (decision table)
 *   5 → Ask create proposal
 *   6 → Complete: create entities
 */
export const novoDealHandler: FlowHandler = {
  command: 'novodeal',
  totalSteps: 7,

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
          return handleStep1(input, data);
        case 2:
          return handleStep2(input, data);
        case 3:
          return handleStep3(input, data);
        case 4:
          return handleStep4(input, data);
        case 5:
          return handleStep5(input, data);
        case 6:
          return handleStep6(data);
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

// ─── Step 0: Ask name ──────────────────────────────────────────
function handleStep0(): StepResult {
  return {
    message: 'Qual o nome do cliente?',
    nextStep: 1,
    updatedData: {},
  };
}

// ─── Step 1: Receive name, ask phone ───────────────────────────
function handleStep1(input: string, data: Record<string, any>): StepResult {
  const trimmed = input.trim();

  if (!trimmed || trimmed.length === 0) {
    return {
      message: 'Por favor, informe um nome válido.',
      nextStep: 1,
      updatedData: {},
    };
  }

  if (trimmed.length > 200) {
    return {
      message: 'Por favor, informe um nome válido.',
      nextStep: 1,
      updatedData: {},
    };
  }

  return {
    message: `Qual o telefone do(a) ${trimmed}?`,
    nextStep: 2,
    updatedData: { clientName: trimmed },
  };
}

// ─── Step 2: Receive phone, list packages ──────────────────────
async function handleStep2(
  input: string,
  data: Record<string, any>
): Promise<StepResult> {
  const phone = stripPhone(input);

  if (phone.length < 10 || phone.length > 13) {
    return {
      message: 'Por favor, informe um telefone válido (10 a 13 dígitos).',
      nextStep: 2,
      updatedData: { phone },
    };
  }

  // Fetch active packages
  const packages = await db.package.findMany({
    where: { active: true },
  });

  if (!packages || packages.length === 0) {
    return {
      message: 'Nenhum pacote cadastrado no momento. Encerrando fluxo.',
      nextStep: null,
      updatedData: { phone },
    };
  }

  // Build package list message
  const packageList = packages
    .map((pkg: any) => `*${pkg.name}* — ${formatCurrency(pkg.value)}`)
    .join('\n');

  return {
    message: `Pacotes disponíveis:\n${packageList}\n\nQual pacote?`,
    nextStep: 3,
    updatedData: { phone },
  };
}

// ─── Step 3: Select package ────────────────────────────────────
async function handleStep3(
  input: string,
  data: Record<string, any>
): Promise<StepResult> {
  const query = input.trim().toLowerCase();

  const packages = await db.package.findMany({
    where: { active: true },
  });

  // Try to find a matching package (case-insensitive partial match)
  const matched = packages.find((pkg: any) =>
    pkg.name.toLowerCase().includes(query)
  );

  if (!matched) {
    const available = packages
      .map((pkg: any) => pkg.name)
      .join('\n');
    return {
      message: `Pacote não encontrado. Os pacotes disponíveis são:\n${available}`,
      nextStep: 3,
      updatedData: {},
    };
  }

  return {
    message: 'Quer editar o pacote? (sim/não)',
    nextStep: 4,
    updatedData: {
      packageName: matched.name,
      packageId: matched.id,
    },
  };
}

// ─── Step 4: Edit package (Decision Table) ─────────────────────
function handleStep4(input: string, data: Record<string, any>): StepResult {
  const trimmed = input.trim().toLowerCase();

  // If we're in an active edit sub-step
  if (data.editing) {
    // If no editField selected yet, user is choosing what to edit
    if (!data.editField) {
      if (trimmed === 'valor') {
        return {
          message: 'Qual o novo valor?',
          nextStep: 4,
          updatedData: {
            ...data,
            editField: 'valor',
          },
        };
      }

      if (trimmed === 'descrição' || trimmed === 'descricao') {
        return {
          message: 'Qual a nova descrição?',
          nextStep: 4,
          updatedData: {
            ...data,
            editField: 'descrição',
          },
        };
      }

      return {
        message: 'Opção inválida. Escolha "valor" ou "descrição".',
        nextStep: 4,
        updatedData: data,
      };
    }

    // editField is set — user is providing the value/description
    if (data.editField === 'valor') {
      // Parse the value (strip R$ and formatting)
      const rawValue = input.replace(/[R$.\s]/g, '').replace(',', '.');
      const numericValue = parseFloat(rawValue);

      if (isNaN(numericValue) || numericValue < 0) {
        return {
          message: 'Por favor, informe um valor válido (número positivo).',
          nextStep: 4,
          updatedData: data,
        };
      }

      const cleanData = { ...data };
      delete cleanData.editing;
      delete cleanData.editField;

      return {
        message: 'Deseja criar uma proposta? (sim/não)',
        nextStep: 5,
        updatedData: {
          ...cleanData,
          packageValue: numericValue,
        },
      };
    }

    if (data.editField === 'descrição') {
      const description = input.trim();

      if (!description) {
        return {
          message: 'Por favor, informe uma descrição válida.',
          nextStep: 4,
          updatedData: data,
        };
      }

      const cleanData = { ...data };
      delete cleanData.editing;
      delete cleanData.editField;

      return {
        message: 'Deseja criar uma proposta? (sim/não)',
        nextStep: 5,
        updatedData: {
          ...cleanData,
          packageDescription: description,
        },
      };
    }
  }

  // Not in editing sub-step — asking sim/não
  if (trimmed === 'não' || trimmed === 'nao') {
    return {
      message: 'Deseja criar uma proposta? (sim/não)',
      nextStep: 5,
      updatedData: data,
    };
  }

  if (trimmed === 'sim') {
    return {
      message: 'O que quer editar? (valor/descrição)',
      nextStep: 4,
      updatedData: {
        ...data,
        editing: true,
      },
    };
  }

  return {
    message: 'Por favor, responda "sim" ou "não".',
    nextStep: 4,
    updatedData: {},
  };
}

// ─── Step 5: Ask create proposal ──────────────────────────────
function handleStep5(input: string, data: Record<string, any>): StepResult {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === 'sim') {
    return {
      message: 'Criando deal e registrando tudo...',
      nextStep: 6,
      updatedData: {
        ...data,
        createProposal: true,
      },
    };
  }

  if (trimmed === 'não' || trimmed === 'nao') {
    return {
      message: 'Criando deal e registrando tudo...',
      nextStep: 6,
      updatedData: {
        ...data,
        createProposal: false,
      },
    };
  }

  return {
    message: 'Por favor, responda "sim" ou "não".',
    nextStep: 5,
    updatedData: {},
  };
}

// ─── Step 6: Complete — Create entities ────────────────────────
async function handleStep6(
  data: Record<string, any>
): Promise<StepResult> {
  try {
    // 1. Create client
    const client = await db.client.create({
      data: {
        name: data.clientName,
        phone: data.phone,
      },
    });

    // 2. Create deal
    const deal = await db.deal.create({
      data: {
        clientId: client.id,
        packageId: data.packageId,
        packageValue: data.packageValue,
        packageDescription: data.packageDescription,
      },
    });

    // 3. Optionally create proposal
    let proposalId: string | undefined;
    if (data.createProposal) {
      const proposal = await db.proposal.create({
        data: {
          dealId: deal.id,
        },
      });
      proposalId = proposal.id;
    }

    // 4. Delete session
    await db.commandSession.deleteMany({
      where: { phone: data.phone },
    });

    // Build confirmation message
    const parts: string[] = [
      '✅ *Deal criado com sucesso!*',
      '',
      `Cliente: ${data.clientName}`,
      `Pacote: ${data.packageName}`,
    ];

    if (data.packageValue) {
      parts.push(`Valor editado: ${formatCurrency(data.packageValue)}`);
    }
    if (data.packageDescription) {
      parts.push(`Descrição editada: ${data.packageDescription}`);
    }

    if (proposalId) {
      parts.push('', '📄 Proposta criada com sucesso!');
    } else {
      parts.push('', 'ℹ️ Deal criado sem proposta.');
    }

    return {
      message: parts.join('\n'),
      nextStep: null,
      updatedData: {},
      result: {
        action: 'create_entities',
        entities: {
          clientId: client.id,
          dealId: deal.id,
          ...(proposalId ? { proposalId } : {}),
        },
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      message: `Erro ao criar entidades: ${message}`,
      nextStep: null,
      updatedData: {},
    };
  }
}
