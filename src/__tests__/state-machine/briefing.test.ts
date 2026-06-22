import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { briefingHandler } from '@/lib/whatsapp/flows/briefing';

const mockDeal = (overrides: Record<string, unknown> = {}) => ({
  id: 'deal-1',
  organizationId: 'org-1',
  clientId: 'client-1',
  title: 'Casamento João & Maria',
  description: 'Casamento na praia',
  status: 'active',
  value: 15000,
  currency: 'BRL',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockBriefing = (overrides: Record<string, unknown> = {}) => ({
  id: 'brief-1',
  dealId: 'deal-1',
  content: 'Briefing content',
  author: 'WhatsApp',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Step 0: Ask project ID ─────────────────────────────────────
describe('/briefing — Step 0: Ask project ID', () => {
  it('asks for project ID on first call (input ignored)', async () => {
    const result = await briefingHandler.handle('', {}, 0, 'org-1');

    expect(result.message).toBe('Qual o ID do projeto?');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('ignores any input text at step 0', async () => {
    const result = await briefingHandler.handle('qualquer coisa', {}, 0, 'org-1');

    expect(result.message).toBe('Qual o ID do projeto?');
    expect(result.nextStep).toBe(1);
  });
});

// ─── Step 1: Receive briefing text, ask confirm ─────────────────
describe('/briefing — Step 1: Receive briefing text', () => {
  const dataWithProject = { projectId: 'deal-1' };

  it('accepts valid briefing text and asks for confirmation', async () => {
    const result = await briefingHandler.handle(
      'Cliente deseja um casamento na praia com decoração floral.',
      dataWithProject,
      1
    );

    expect(result.message).toContain('confirmar');
    expect(result.message).toContain('cancelar');
    expect(result.nextStep).toBe(2);
    expect(result.updatedData).toEqual({
      projectId: 'deal-1',
      content: 'Cliente deseja um casamento na praia com decoração floral.',
    });
  });

  it('accepts 1-character briefing (lower boundary)', async () => {
    const result = await briefingHandler.handle('A', dataWithProject, 1, 'org-1');

    expect(result.nextStep).toBe(2);
    expect(result.updatedData.content).toBe('A');
  });

  it('accepts 10000-character briefing (upper boundary)', async () => {
    const content = 'A'.repeat(10000);
    const result = await briefingHandler.handle(content, dataWithProject, 1, 'org-1');

    expect(result.nextStep).toBe(2);
    expect(result.updatedData.content.length).toBe(10000);
  });

  it('rejects empty briefing', async () => {
    const result = await briefingHandler.handle('', dataWithProject, 1, 'org-1');

    expect(result.message).toBe(
      'Por favor, informe o briefing (1 a 10000 caracteres).'
    );
    expect(result.nextStep).toBe(1);
  });

  it('rejects whitespace-only briefing', async () => {
    const result = await briefingHandler.handle('   ', dataWithProject, 1, 'org-1');

    expect(result.message).toBe(
      'Por favor, informe o briefing (1 a 10000 caracteres).'
    );
    expect(result.nextStep).toBe(1);
  });

  it('rejects briefing longer than 10000 characters', async () => {
    const content = 'A'.repeat(10001);
    const result = await briefingHandler.handle(content, dataWithProject, 1, 'org-1');

    expect(result.message).toBe(
      'Por favor, informe o briefing (1 a 10000 caracteres).'
    );
    expect(result.nextStep).toBe(1);
  });
});

// ─── Step 2: Confirm or cancel ──────────────────────────────────
describe('/briefing — Step 2: Confirm or cancel', () => {
  const dataReady = {
    projectId: 'deal-1',
    content: 'Cliente deseja um casamento na praia com decoração floral.',
  };

  it('"confirmar" creates briefing and completes flow', async () => {
    vi.mocked(db.briefing.create).mockResolvedValue(mockBriefing());

    const result = await briefingHandler.handle('confirmar', dataReady, 2, 'org-1');

    expect(db.briefing.create).toHaveBeenCalledWith({
      data: {
        dealId: 'deal-1',
        content: 'Cliente deseja um casamento na praia com decoração floral.',
        author: 'WhatsApp',
      },
    });
    expect(result.message).toContain('Briefing salvo');
    expect(result.nextStep).toBeNull();
    expect(result.result).toEqual({
      action: 'create_briefing',
      entities: { briefingId: 'brief-1' },
    });
  });

  it('"CONFIRMAR" (uppercase) creates briefing', async () => {
    vi.mocked(db.briefing.create).mockResolvedValue(mockBriefing());

    const result = await briefingHandler.handle('CONFIRMAR', dataReady, 2, 'org-1');

    expect(db.briefing.create).toHaveBeenCalled();
    expect(result.nextStep).toBeNull();
  });

  it('"cancelar" goes back to step 0 to ask project ID again', async () => {
    const result = await briefingHandler.handle('cancelar', dataReady, 2, 'org-1');

    expect(result.message).toBe('Briefing cancelado. Vamos começar de novo.\n\nQual o ID do projeto?');
    expect(result.nextStep).toBe(0);
    expect(result.updatedData).toEqual({});
    expect(db.briefing.create).not.toHaveBeenCalled();
  });

  it('"CANCELAR" (uppercase) goes back to step 0', async () => {
    const result = await briefingHandler.handle('CANCELAR', dataReady, 2, 'org-1');

    expect(result.nextStep).toBe(0);
    expect(db.briefing.create).not.toHaveBeenCalled();
  });

  it('invalid input stays at step 2 with error', async () => {
    const result = await briefingHandler.handle('talvez', dataReady, 2, 'org-1');

    expect(result.message).toBe(
      'Por favor, responda "confirmar" para salvar ou "cancelar" para recomeçar.'
    );
    expect(result.nextStep).toBe(2);
    expect(db.briefing.create).not.toHaveBeenCalled();
  });

  it('handles DB error on briefing creation', async () => {
    vi.mocked(db.briefing.create).mockRejectedValue(new Error('DB error'));

    const result = await briefingHandler.handle('confirmar', dataReady, 2, 'org-1');

    expect(result.message).toContain('Erro ao criar');
    expect(result.nextStep).toBeNull();
  });
});

// ─── Edge cases ─────────────────────────────────────────────────
describe('/briefing — Edge cases', () => {
  it('handles invalid step number gracefully', async () => {
    const result = await briefingHandler.handle('test', {}, 99, 'org-1');

    expect(result.message).toContain('Erro');
    expect(result.nextStep).toBeNull();
  });
});

// ─── FlowHandler interface ──────────────────────────────────────
describe('/briefing — FlowHandler interface', () => {
  it('exports command as "briefing"', () => {
    expect(briefingHandler.command).toBe('briefing');
  });

  it('exports totalSteps as 3', () => {
    expect(briefingHandler.totalSteps).toBe(3);
  });
});
