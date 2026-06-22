import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { receitaHandler } from '@/lib/whatsapp/flows/receita';

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

const mockRevenue = (overrides: Record<string, unknown> = {}) => ({
  id: 'rev-1',
  dealId: 'deal-1',
  description: 'Pagamento entrada',
  amount: 5000,
  currency: 'BRL',
  date: new Date(),
  status: 'received',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Step 0: Ask project ID ─────────────────────────────────────
describe('/receita — Step 0: Ask project ID', () => {
  it('asks for project ID on first call (input ignored)', async () => {
    const result = await receitaHandler.handle('', {}, 0, 'org-1');

    expect(result.message).toBe('Qual o ID do projeto?');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('ignores any input text at step 0', async () => {
    const result = await receitaHandler.handle('qualquer coisa', {}, 0, 'org-1');

    expect(result.message).toBe('Qual o ID do projeto?');
    expect(result.nextStep).toBe(1);
  });
});

// ─── Step 1: Receive project ID, validate, ask value ────────────
describe('/receita — Step 1: Validate project ID', () => {
  it('accepts valid project ID and asks for value', async () => {
    vi.mocked(db.deal.findUnique).mockResolvedValue(mockDeal());

    const result = await receitaHandler.handle('deal-1', {}, 1, 'org-1');

    expect(db.deal.findUnique).toHaveBeenCalledWith({
      where: { id: 'deal-1', organizationId: 'org-1' },
    });
    expect(result.message).toContain('Casamento João & Maria');
    expect(result.message).toContain('valor');
    expect(result.nextStep).toBe(2);
    expect(result.updatedData).toEqual({ projectId: 'deal-1' });
  });

  it('strips # prefix from project ID', async () => {
    vi.mocked(db.deal.findUnique).mockResolvedValue(mockDeal());

    const result = await receitaHandler.handle('#deal-1', {}, 1, 'org-1');

    expect(db.deal.findUnique).toHaveBeenCalledWith({
      where: { id: 'deal-1', organizationId: 'org-1' },
    });
    expect(result.nextStep).toBe(2);
  });

  it('rejects empty project ID', async () => {
    const result = await receitaHandler.handle('', {}, 1, 'org-1');

    expect(result.message).toBe('Por favor, informe um ID de projeto válido.');
    expect(result.nextStep).toBe(1);
  });

  it('rejects project ID when deal not found', async () => {
    vi.mocked(db.deal.findUnique).mockResolvedValue(null);

    const result = await receitaHandler.handle('nonexistent-id', {}, 1, 'org-1');

    expect(result.message).toBe('Projeto não encontrado. Verifique o ID e tente novamente.');
    expect(result.nextStep).toBe(1);
  });

  it('handles DB error gracefully', async () => {
    vi.mocked(db.deal.findUnique).mockRejectedValue(new Error('DB error'));

    const result = await receitaHandler.handle('deal-1', {}, 1, 'org-1');

    expect(result.message).toContain('Erro ao processar');
    expect(result.nextStep).toBeNull();
  });
});

// ─── Step 2: Receive value, validate, ask description ───────────
describe('/receita — Step 2: Receive value', () => {
  const dataWithProject = { projectId: 'deal-1' };

  it('accepts valid numeric value and asks for description', async () => {
    const result = await receitaHandler.handle('5000', dataWithProject, 2, 'org-1');

    expect(result.message).toBe('Qual a descrição da receita?');
    expect(result.nextStep).toBe(3);
    expect(result.updatedData).toEqual({ projectId: 'deal-1', amount: 5000 });
  });

  it('accepts value 0.01 (lower boundary)', async () => {
    const result = await receitaHandler.handle('0,01', dataWithProject, 2, 'org-1');

    expect(result.nextStep).toBe(3);
    expect(result.updatedData.amount).toBeCloseTo(0.01);
  });

  it('rejects value 0', async () => {
    const result = await receitaHandler.handle('0', dataWithProject, 2, 'org-1');

    expect(result.message).toBe('Por favor, informe um valor válido maior que zero.');
    expect(result.nextStep).toBe(2);
  });

  it('rejects negative value', async () => {
    const result = await receitaHandler.handle('-100', dataWithProject, 2, 'org-1');

    expect(result.message).toBe('Por favor, informe um valor válido maior que zero.');
    expect(result.nextStep).toBe(2);
  });

  it('accepts R$ prefix', async () => {
    const result = await receitaHandler.handle('R$ 5000', dataWithProject, 2, 'org-1');

    expect(result.nextStep).toBe(3);
    expect(result.updatedData.amount).toBe(5000);
  });

  it('accepts Brazilian format 1.500,50', async () => {
    const result = await receitaHandler.handle('1.500,50', dataWithProject, 2, 'org-1');

    expect(result.nextStep).toBe(3);
    expect(result.updatedData.amount).toBeCloseTo(1500.50);
  });

  it('rejects empty input', async () => {
    const result = await receitaHandler.handle('', dataWithProject, 2, 'org-1');

    expect(result.message).toBe('Por favor, informe um valor válido maior que zero.');
    expect(result.nextStep).toBe(2);
  });
});

// ─── Step 3: Receive description, ask status ────────────────────
describe('/receita — Step 3: Receive description', () => {
  const dataWithValue = { projectId: 'deal-1', amount: 5000 };

  it('accepts valid description and asks for status', async () => {
    const result = await receitaHandler.handle('Pagamento da entrada', dataWithValue, 3, 'org-1');

    expect(result.message).toContain('recebido');
    expect(result.message).toContain('pendente');
    expect(result.nextStep).toBe(4);
    expect(result.updatedData).toEqual({
      projectId: 'deal-1',
      amount: 5000,
      description: 'Pagamento da entrada',
    });
  });

  it('accepts 1-character description (lower boundary)', async () => {
    const result = await receitaHandler.handle('A', dataWithValue, 3, 'org-1');

    expect(result.nextStep).toBe(4);
  });

  it('accepts 500-character description (upper boundary)', async () => {
    const desc = 'A'.repeat(500);
    const result = await receitaHandler.handle(desc, dataWithValue, 3, 'org-1');

    expect(result.nextStep).toBe(4);
  });

  it('rejects empty description', async () => {
    const result = await receitaHandler.handle('', dataWithValue, 3, 'org-1');

    expect(result.message).toBe('Por favor, informe uma descrição (1 a 500 caracteres).');
    expect(result.nextStep).toBe(3);
  });

  it('rejects description longer than 500 characters', async () => {
    const desc = 'A'.repeat(501);
    const result = await receitaHandler.handle(desc, dataWithValue, 3, 'org-1');

    expect(result.message).toBe('Por favor, informe uma descrição (1 a 500 caracteres).');
    expect(result.nextStep).toBe(3);
  });
});

// ─── Step 4: Receive status, create revenue ─────────────────────
describe('/receita — Step 4: Create revenue', () => {
  const dataReady = {
    projectId: 'deal-1',
    amount: 5000,
    description: 'Pagamento da entrada',
  };

  it('creates revenue with status "recebido"', async () => {
    vi.mocked(db.revenue.create).mockResolvedValue(mockRevenue({ status: 'received' }));

    const result = await receitaHandler.handle('recebido', dataReady, 4, 'org-1');

    expect(db.revenue.create).toHaveBeenCalledWith({
      data: {
        dealId: 'deal-1',
        description: 'Pagamento da entrada',
        amount: 5000,
        currency: 'BRL',
        status: 'received',
      },
    });
    expect(result.message).toContain('Receita registrada');
    expect(result.message).toContain('R$ 5.000');
    expect(result.message).toContain('recebido');
    expect(result.nextStep).toBeNull();
    expect(result.result).toEqual({
      action: 'create_revenue',
      entities: { revenueId: 'rev-1' },
    });
  });

  it('creates revenue with status "pendente"', async () => {
    vi.mocked(db.revenue.create).mockResolvedValue(mockRevenue({ status: 'pending' }));

    const result = await receitaHandler.handle('pendente', dataReady, 4, 'org-1');

    expect(db.revenue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'pending' }),
    });
    expect(result.message).toContain('Receita registrada');
    expect(result.message).toContain('pendente');
    expect(result.nextStep).toBeNull();
  });

  it('rejects invalid status', async () => {
    const result = await receitaHandler.handle('parcial', dataReady, 4, 'org-1');

    expect(result.message).toBe(
      'Status inválido. A receita foi recebida ou está pendente? (recebido/pendente)'
    );
    expect(result.nextStep).toBe(4);
    expect(db.revenue.create).not.toHaveBeenCalled();
  });

  it('rejects empty status', async () => {
    const result = await receitaHandler.handle('', dataReady, 4, 'org-1');

    expect(result.nextStep).toBe(4);
    expect(db.revenue.create).not.toHaveBeenCalled();
  });

  it('handles DB error gracefully', async () => {
    vi.mocked(db.revenue.create).mockRejectedValue(new Error('DB error'));

    const result = await receitaHandler.handle('recebido', dataReady, 4, 'org-1');

    expect(result.message).toContain('Erro ao criar');
    expect(result.nextStep).toBeNull();
  });
});

// ─── Edge cases ─────────────────────────────────────────────────
describe('/receita — Edge cases', () => {
  it('handles invalid step number gracefully', async () => {
    const result = await receitaHandler.handle('test', {}, 99, 'org-1');

    expect(result.message).toContain('Erro');
    expect(result.nextStep).toBeNull();
  });
});

// ─── FlowHandler interface ──────────────────────────────────────
describe('/receita — FlowHandler interface', () => {
  it('exports command as "receita"', () => {
    expect(receitaHandler.command).toBe('receita');
  });

  it('exports totalSteps as 5', () => {
    expect(receitaHandler.totalSteps).toBe(5);
  });
});
