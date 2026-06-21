import type { FlowHandler, StepResult } from './index';

/**
 * /ajuda — 0-step flow that returns a list of all available commands.
 * No session needed; one-shot response.
 */
export const ajudaHandler: FlowHandler = {
  command: 'ajuda',
  totalSteps: 0,

  async handle(
    _input: string,
    _data: Record<string, any>,
    _step: number
  ): Promise<StepResult> {
    const lines: string[] = [
      '🤖 *Comandos disponíveis:*',
      '',
      '*/novoDeal* — Criar um novo deal (cliente + pacote + proposta)',
      '*/despesa* — Registrar uma despesa no projeto',
      '*/receita* — Registrar uma receita no projeto',
      '*/briefing* — Adicionar um briefing ao projeto',
      '*/status* — Ver o status resumido do projeto',
      '*/contatos* — Buscar contatos cadastrados',
      '*/calendario* — Ver agendamentos (hoje/semana/mês)',
      '*/projeto* — Ver detalhes completos de um projeto',
      '*/ajuda* — Exibir esta lista de comandos',
      '*/pacotes* — Listar pacotes (ativos ou todos)',
      '*/cancelar* — Cancelar o fluxo atual',
      '',
      'Envie um comando para começar! 🚀',
    ];

    return {
      message: lines.join('\n'),
      nextStep: null,
      updatedData: {},
    };
  },
};
