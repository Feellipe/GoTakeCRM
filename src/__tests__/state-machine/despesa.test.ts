import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { despesaHandler } from '@/lib/whatsapp/flows/despesa';

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

const mockExpense = (overrides: Record<string, unknown> = {}) => ({
  id: 'exp-1',
  dealId: 'deal-1',
  category: 'equipamento',
  description: 'Aluguel de câmera',
  amount: 5000,
  currency: 'BRL',
  date: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Step 0: Ask project ID ─────────────────────────────────────
describe('/despesa — Step 0: Ask project ID', () => {
  it('asks for project ID on first call (input ignored)', async () => {
    const result = await despesaHandler.handle('', {}, 0);

    expect(result.message).toBe('Qual o ID do projeto?');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('ignores any input text at step 0', async () => {
    const result = await despesaHandler.handle('qualquer coisa', {}, 0);

    expect(result.message).toBe('Qual o ID do projeto?');
    expect(result.nextStep).toBe(1);
  });
});

// ─── Step 1: Receive project ID, validate, ask value ────────────
describe('/despesa — Step 1: Validate project ID', () => {
  it('accepts valid project ID and asks for value', async () => {
    vi.mocked(db.deal.findUnique).mockResolvedValue(mockDeal());

    const result = await despesaHandler.handle('deal-1', {}, 1);

    expect(db.deal.findUnique).toHaveBeenCalledWith({
      where: { id: 'deal-1' },
    });
    expect(result.message).toContain('Casamento João & Maria');
    expect(result.message).toContain('valor');
    expect(result.nextStep).toBe(2);
    expect(result.updatedData).toEqual({ projectId: 'deal-1' });
  });

  it('strips # prefix from project ID', async () => {
    vi.mocked(db.deal.findUnique).mockResolvedValue(mockDeal());

    const result = await despesaHandler.handle('#deal-1', {}, 1);

    expect(db.deal.findUnique).toHaveBeenCalledWith({
      where: { id: 'deal-1' },
    });
    expect(result.nextStep).toBe(2);
    expect(result.updatedData).toEqual({ projectId: 'deal-1' });
  });

  it('rejects empty project ID', async () => {
    const result = await despesaHandler.handle('', {}, 1);

    expect(result.message).toBe('Por favor, informe um ID de projeto válido.');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('rejects whitespace-only project ID', async () => {
    const result = await despesaHandler.handle('   ', {}, 1);

    expect(result.message).toBe('Por favor, informe um ID de projeto válido.');
    expect(result.nextStep).toBe(1);
  });

  it('rejects project ID when deal not found', async () => {
    vi.mocked(db.deal.findUnique).mockResolvedValue(null);

    const result = await despesaHandler.handle('nonexistent-id', {}, 1);

    expect(result.message).toBe('Projeto não encontrado. Verifique o ID e tente novamente.');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('handles DB error gracefully on findUnique', async () => {
    vi.mocked(db.deal.findUnique).mockRejectedValue(new Error('DB connection failed'));

    const result = await despesaHandler.handle('deal-1', {}, 1);

    expect(result.message).toContain('Erro ao processar');
    expect(result.nextStep).toBeNull();
  });
});

// ─── Step 2: Receive value, validate, ask description ───────────
describe('/despesa — Step 2: Receive value', () => {
  const dataWithProject = { projectId: 'deal-1' };

  it('accepts valid numeric value and asks for description', async () => {
    const result = await despesaHandler.handle('5000', dataWithProject, 2);

    expect(result.message).toBe('Qual a descrição da despesa?');
    expect(result.nextStep).toBe(3);
    expect(result.updatedData).toEqual({ projectId: 'deal-1', amount: 5000 });
  });

  it('accepts value 0.01 (lower boundary)', async () => {
    const result = await despesaHandler.handle('0,01', dataWithProject, 2);

    expect(result.nextStep).toBe(3);
    expect(result.updatedData.amount).toBeCloseTo(0.01);
  });

  it('rejects value 0 (invalid — must be positive)', async () => {
    const result = await despesaHandler.handle('0', dataWithProject, 2);

    expect(result.message).toBe('Por favor, informe um valor válido maior que zero.');
    expect(result.nextStep).toBe(2);
  });

  it('rejects negative value', async () => {
    const result = await despesaHandler.handle('-100', dataWithProject, 2);

    expect(result.message).toBe('Por favor, informe um valor válido maior que zero.');
    expect(result.nextStep).toBe(2);
  });

  it('accepts value with R$ prefix', async () => {
    const result = await despesaHandler.handle('R$ 5000', dataWithProject, 2);

    expect(result.nextStep).toBe(3);
    expect(result.updatedData.amount).toBe(5000);
  });

  it('accepts Brazilian format 1.500,50', async () => {
    const result = await despesaHandler.handle('1.500,50', dataWithProject, 2);

    expect(result.nextStep).toBe(3);
    expect(result.updatedData.amount).toBeCloseTo(1500.50);
  });

  it('accepts Brazilian format with R$ and thousands separator', async () => {
    const result = await despesaHandler.handle('R$ 1.500,50', dataWithProject, 2);

    expect(result.nextStep).toBe(3);
    expect(result.updatedData.amount).toBeCloseTo(1500.50);
  });

  it('rejects non-numeric input', async () => {
    const result = await despesaHandler.handle('abc', dataWithProject, 2);

    expect(result.message).toBe('Por favor, informe um valor válido maior que zero.');
    expect(result.nextStep).toBe(2);
  });

  it('rejects empty input', async () => {
    const result = await despesaHandler.handle('', dataWithProject, 2);

    expect(result.message).toBe('Por favor, informe um valor válido maior que zero.');
    expect(result.nextStep).toBe(2);
  });
});

// ─── Step 3: Receive description, validate, ask category ────────
describe('/despesa — Step 3: Receive description', () => {
  const dataWithValue = { projectId: 'deal-1', amount: 5000 };

  it('accepts valid description and asks for category', async () => {
    const result = await despesaHandler.handle('Aluguel de câmera Sony A7III', dataWithValue, 3);

    expect(result.message).toContain('categoria');
    expect(result.message).toContain('equipamento');
    expect(result.message).toContain('locação');
    expect(result.message).toContain('equipe');
    expect(result.message).toContain('transporte');
    expect(result.message).toContain('outro');
    expect(result.nextStep).toBe(4);
    expect(result.updatedData).toEqual({
      projectId: 'deal-1',
      amount: 5000,
      description: 'Aluguel de câmera Sony A7III',
    });
  });

  it('accepts 1-character description (lower boundary)', async () => {
    const result = await despesaHandler.handle('A', dataWithValue, 3);

    expect(result.nextStep).toBe(4);
    expect(result.updatedData.description).toBe('A');
  });

  it('accepts 500-character description (upper boundary)', async () => {
    const desc = 'A'.repeat(500);
    const result = await despesaHandler.handle(desc, dataWithValue, 3);

    expect(result.nextStep).toBe(4);
    expect(result.updatedData.description.length).toBe(500);
  });

  it('rejects empty description', async () => {
    const result = await despesaHandler.handle('', dataWithValue, 3);

    expect(result.message).toBe('Por favor, informe uma descrição (1 a 500 caracteres).');
    expect(result.nextStep).toBe(3);
  });

  it('rejects whitespace-only description', async () => {
    const result = await despesaHandler.handle('   ', dataWithValue, 3);

    expect(result.message).toBe('Por favor, informe uma descrição (1 a 500 caracteres).');
    expect(result.nextStep).toBe(3);
  });

  it('rejects description longer than 500 characters', async () => {
    const desc = 'A'.repeat(501);
    const result = await despesaHandler.handle(desc, dataWithValue, 3);

    expect(result.message).toBe('Por favor, informe uma descrição (1 a 500 caracteres).');
    expect(result.nextStep).toBe(3);
  });
});

// ─── Step 4: Receive category, create expense ────────────────────
describe('/despesa — Step 4: Create expense', () => {
  const dataReady = {
    projectId: 'deal-1',
    amount: 5000,
    description: 'Aluguel de câmera',
  };

  it('accepts valid category "equipamento" and creates expense', async () => {
    vi.mocked(db.expense.create).mockResolvedValue(mockExpense({ category: 'equipamento' }));

    const result = await despesaHandler.handle('equipamento', dataReady, 4);

    expect(db.expense.create).toHaveBeenCalledWith({
      data: {
        dealId: 'deal-1',
        category: 'equipamento',
        description: 'Aluguel de câmera',
        amount: 5000,
        currency: 'BRL',
      },
    });
    expect(result.message).toContain('Despesa registrada');
    expect(result.message).toContain('R$ 5.000');
    expect(result.message).toContain('equipamento');
    expect(result.nextStep).toBeNull();
    expect(result.result).toEqual({
      action: 'create_expense',
      entities: { expenseId: 'exp-1' },
    });
  });

  it('accepts all valid categories', async () => {
    const categories = ['equipamento', 'locação', 'equipe', 'transporte', 'outro'];
    for (const cat of categories) {
      vi.mocked(db.expense.create).mockResolvedValue(mockExpense({ category: cat }));
      vi.clearAllMocks();

      const result = await despesaHandler.handle(cat, dataReady, 4);
      expect(result.nextStep).toBeNull();
      expect(db.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ category: cat }),
        })
      );
    }
  });

  it('rejects invalid category', async () => {
    const result = await despesaHandler.handle('comida', dataReady, 4);

    expect(result.message).toBe(
      'Categoria inválida. As categorias disponíveis são: equipamento, locação, equipe, transporte, outro.'
    );
    expect(result.nextStep).toBe(4);
    expect(db.expense.create).not.toHaveBeenCalled();
  });

  it('rejects empty category', async () => {
    const result = await despesaHandler.handle('', dataReady, 4);

    expect(result.nextStep).toBe(4);
    expect(db.expense.create).not.toHaveBeenCalled();
  });

  it('handles DB error on expense creation gracefully', async () => {
    vi.mocked(db.expense.create).mockRejectedValue(new Error('DB error'));

    const result = await despesaHandler.handle('equipamento', dataReady, 4);

    expect(result.message).toContain('Erro ao criar');
    expect(result.nextStep).toBeNull();
  });
});

// ─── Edge cases ─────────────────────────────────────────────────
describe('/despesa — Edge cases', () => {
  it('handles invalid step number gracefully', async () => {
    const result = await despesaHandler.handle('test', {}, 99);

    expect(result.message).toContain('Erro');
    expect(result.nextStep).toBeNull();
  });

  it('handles non-numeric value like "mil" gracefully', async () => {
    const result = await despesaHandler.handle('mil', { projectId: 'deal-1' }, 2);

    expect(result.message).toBe('Por favor, informe um valor válido maior que zero.');
    expect(result.nextStep).toBe(2);
  });
});

// ─── FlowHandler interface ──────────────────────────────────────
describe('/despesa — FlowHandler interface', () => {
  it('exports command as "despesa"', () => {
    expect(despesaHandler.command).toBe('despesa');
  });

  it('exports totalSteps as 5', () => {
    expect(despesaHandler.totalSteps).toBe(5);
  });
});
