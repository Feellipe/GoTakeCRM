import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { statusHandler } from '@/lib/whatsapp/flows/status';

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
  client: {
    id: 'client-1',
    name: 'João Silva',
    phone: '21999999999',
  },
  briefings: [
    { id: 'brief-1', dealId: 'deal-1', content: 'Briefing content', author: 'WhatsApp' },
  ],
  proposals: [
    { id: 'prop-1', dealId: 'deal-1', status: 'accepted', totalValue: 15000 },
  ],
  expenses: [
    { id: 'exp-1', dealId: 'deal-1', category: 'equipamento', description: 'Câmera', amount: 2000, currency: 'BRL' },
    { id: 'exp-2', dealId: 'deal-1', category: 'transporte', description: 'Transporte', amount: 500, currency: 'BRL' },
  ],
  revenue: [
    { id: 'rev-1', dealId: 'deal-1', description: 'Entrada', amount: 5000, status: 'received', currency: 'BRL' },
    { id: 'rev-2', dealId: 'deal-1', description: 'Restante', amount: 10000, status: 'pending', currency: 'BRL' },
  ],
  ...overrides,
});

const mockDealNoRelations = () => ({
  id: 'deal-2',
  organizationId: 'org-1',
  clientId: 'client-2',
  title: 'Ensaio Familiar',
  description: 'Fotos de família',
  status: 'new',
  value: 3000,
  currency: 'BRL',
  createdAt: new Date(),
  updatedAt: new Date(),
  client: {
    id: 'client-2',
    name: 'Maria Santos',
    phone: '21988888888',
  },
  briefings: [],
  proposals: [],
  expenses: [],
  revenue: [],
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Step 0: Ask project ID ─────────────────────────────────────
describe('/status — Step 0: Ask project ID', () => {
  it('asks for project ID on first call (input ignored)', async () => {
    const result = await statusHandler.handle('', {}, 0);

    expect(result.message).toBe('Qual o ID do projeto?');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('ignores any input text at step 0', async () => {
    const result = await statusHandler.handle('qualquer coisa', {}, 0);

    expect(result.message).toBe('Qual o ID do projeto?');
    expect(result.nextStep).toBe(1);
  });
});

// ─── Step 1: Show project status summary ────────────────────────
describe('/status — Step 1: Show status summary', () => {
  it('shows full status summary for deal with all relations', async () => {
    vi.mocked(db.deal.findUnique).mockResolvedValue(mockDeal());

    const result = await statusHandler.handle('deal-1', {}, 1);

    expect(db.deal.findUnique).toHaveBeenCalledWith({
      where: { id: 'deal-1' },
      include: {
        client: true,
        briefings: true,
        proposals: true,
        expenses: true,
        revenue: true,
      },
    });

    expect(result.message).toContain('Casamento João & Maria');
    expect(result.message).toContain('active');
    expect(result.message).toContain('João Silva');
    expect(result.message).toContain('✅'); // briefing exists
    expect(result.message).toContain('✅'); // proposal exists
    expect(result.message).toContain('R$ 2.500'); // total expenses (2000+500)
    expect(result.message).toContain('R$ 5.000'); // received revenue
    expect(result.message).toContain('R$ 10.000'); // pending revenue
    expect(result.nextStep).toBeNull();
    expect(result.updatedData).toEqual({});
  });

  it('shows ❌ for missing briefings and proposals', async () => {
    vi.mocked(db.deal.findUnique).mockResolvedValue(mockDealNoRelations());

    const result = await statusHandler.handle('deal-2', {}, 1);

    expect(result.message).toContain('Ensaio Familiar');
    expect(result.message).toContain('❌'); // no briefing
    expect(result.message).toContain('❌'); // no proposal
    expect(result.message).toContain('R$ 0'); // no expenses/revenue
    expect(result.nextStep).toBeNull();
  });

  it('strips # prefix from project ID', async () => {
    vi.mocked(db.deal.findUnique).mockResolvedValue(mockDeal());

    const result = await statusHandler.handle('#deal-1', {}, 1);

    expect(db.deal.findUnique).toHaveBeenCalledWith({
      where: { id: 'deal-1' },
      include: expect.any(Object),
    });
    expect(result.nextStep).toBeNull();
  });

  it('shows "Projeto não encontrado" when deal does not exist', async () => {
    vi.mocked(db.deal.findUnique).mockResolvedValue(null);

    const result = await statusHandler.handle('nonexistent-id', {}, 1);

    expect(result.message).toBe('Projeto não encontrado.');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('rejects empty ID input', async () => {
    const result = await statusHandler.handle('', {}, 1);

    expect(result.message).toBe('Por favor, informe um ID de projeto válido.');
    expect(result.nextStep).toBe(1);
  });

  it('handles DB error gracefully', async () => {
    vi.mocked(db.deal.findUnique).mockRejectedValue(new Error('DB error'));

    const result = await statusHandler.handle('deal-1', {}, 1);

    expect(result.message).toContain('Erro ao processar');
    expect(result.nextStep).toBeNull();
  });
});

// ─── Edge cases ─────────────────────────────────────────────────
describe('/status — Edge cases', () => {
  it('handles invalid step number gracefully', async () => {
    const result = await statusHandler.handle('test', {}, 99);

    expect(result.message).toContain('Erro');
    expect(result.nextStep).toBeNull();
  });
});

// ─── FlowHandler interface ──────────────────────────────────────
describe('/status — FlowHandler interface', () => {
  it('exports command as "status"', () => {
    expect(statusHandler.command).toBe('status');
  });

  it('exports totalSteps as 2', () => {
    expect(statusHandler.totalSteps).toBe(2);
  });
});
