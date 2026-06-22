export interface StepResult {
  message: string;
  nextStep: number | null;  // null = flow complete
  updatedData: Record<string, any>;
  result?: { action: string; entities: Record<string, any> };
}

export interface FlowHandler {
  readonly command: string;
  readonly totalSteps: number;
  handle(input: string, data: Record<string, any>, step: number, organizationId: string): Promise<StepResult>;
}

import { novoDealHandler } from './novoDeal';
import { despesaHandler } from './despesa';
import { receitaHandler } from './receita';
import { briefingHandler } from './briefing';
import { statusHandler } from './status';
import { contatosHandler } from './contatos';
import { calendarioHandler } from './calendario';
import { ajudaHandler } from './ajuda';
import { projetoHandler } from './projeto';
import { pacotesHandler } from './pacotes';

/**
 * Map of command name → FlowHandler for all registered WhatsApp slash commands.
 */
export const FLOWS: Map<string, FlowHandler> = new Map([
  [novoDealHandler.command, novoDealHandler],
  [despesaHandler.command, despesaHandler],
  [receitaHandler.command, receitaHandler],
  [briefingHandler.command, briefingHandler],
  [statusHandler.command, statusHandler],
  [contatosHandler.command, contatosHandler],
  [calendarioHandler.command, calendarioHandler],
  [ajudaHandler.command, ajudaHandler],
  [projetoHandler.command, projetoHandler],
  [pacotesHandler.command, pacotesHandler],
]);
