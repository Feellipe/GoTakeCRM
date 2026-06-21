import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { projetoHandler } from '@/lib/whatsapp/flows/projeto';

const mockFullDeal = (overrides: Record<string, unknown> = {}) => ({
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
  bookings: [
    { id: 'book-1', dealId: 'deal-1', title: 'Cerimônia', date: new Date('2026-07-15'), status: 'confirmed' },
  ],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── FlowHandler interface ──────────────────────────────────────
describe('/projeto — FlowHandler interface', () => {
  it('exports command as "projeto"', () => {
    expect(projetoHandler.command).toBe('projeto');
  });

  it('exports totalSteps as 2', () => {
    expect(projetoHandler.totalSteps).toBe(2);
  });
});

// ─── Step 0: Ask project ID ─────────────────────────────────────
describe('/projeto — Step 0: Ask project ID', () => {
  it('asks for project ID on first call (input ignored)', async () => {
    const result = await projetoHandler.handle('', {}, 0);

    expect(result.message).toContain('ID do projeto');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('ignores any input text at step 0', async () => {
    const result = await projetoHandler.handle('qualquer coisa', {}, 0);

    expect(result.nextStep).toBe(1);
  });
});

// ─── Step 1: Show full project details ──────────────────────────
describe('/projeto — Step 1: Show project details', () => {
  it('shows full project details with client, briefings, proposals, bookings', async () => {
    vi.mocked(db.deal.findUnique).mockResolvedValue(mockFullDeal());

    const result = await projetoHandler.handle('deal-1', {}, 1);

    expect(db.deal.findUnique).toHaveBeenCalledWith({
      where: { id: 'deal-1' },
      include: {
        client: true,
        briefings: true,
        proposals: true,
        bookings: true,
      },
    });

    expect(result.message).toContain('Casamento João & Maria');
    expect(result.message).toContain('João Silva');
    expect(result.message).toContain('active');
    expect(result.message).toContain('Briefing content');
    expect(result.message).toContain('accepted');
    expect(result.message).toContain('Cerimônia');
    expect(result.nextStep).toBeNull();
    expect(result.updatedData).toEqual({});
  });

  it('shows "Projeto não encontrado" when deal does not exist', async () => {
    vi.mocked(db.deal.findUnique).mockResolvedValue(null);

    const result = await projetoHandler.handle('nonexistent', {}, 1);

    expect(result.message).toBe('Projeto não encontrado.');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('rejects empty project ID', async () => {
    const result = await projetoHandler.handle('', {}, 1);

    expect(result.message).toBe('Por favor, informe um ID de projeto válido.');
    expect(result.nextStep).toBe(1);
  });

  it('handles DB error gracefully', async () => {
    vi.mocked(db.deal.findUnique).mockRejectedValue(new Error('DB error'));

    const result = await projetoHandler.handle('deal-1', {}, 1);

    expect(result.message).toContain('Erro ao processar');
    expect(result.nextStep).toBeNull();
  });
});

// ─── Edge cases ─────────────────────────────────────────────────
describe('/projeto — Edge cases', () => {
  it('handles invalid step number gracefully', async () => {
    const result = await projetoHandler.handle('test', {}, 99);

    expect(result.message).toContain('Erro');
    expect(result.nextStep).toBeNull();
  });
});
