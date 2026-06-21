import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { contatosHandler } from '@/lib/whatsapp/flows/contatos';

const mockClient = (overrides: Record<string, unknown> = {}) => ({
  id: 'client-1',
  name: 'João Silva',
  phone: '21999999999',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── FlowHandler interface ──────────────────────────────────────
describe('/contatos — FlowHandler interface', () => {
  it('exports command as "contatos"', () => {
    expect(contatosHandler.command).toBe('contatos');
  });

  it('exports totalSteps as 3', () => {
    expect(contatosHandler.totalSteps).toBe(3);
  });
});

// ─── Step 0: Ask search term ────────────────────────────────────
describe('/contatos — Step 0: Ask search term', () => {
  it('asks for search term on first call (input ignored)', async () => {
    const result = await contatosHandler.handle('', {}, 0);

    expect(result.message).toContain('termo de busca');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('ignores any input text at step 0', async () => {
    const result = await contatosHandler.handle('qualquer coisa', {}, 0);

    expect(result.nextStep).toBe(1);
  });
});

// ─── Step 1: Validate search term ────────────────────────────────
describe('/contatos — Step 1: Validate search term', () => {
  it('rejects empty search term', async () => {
    const result = await contatosHandler.handle('', {}, 1);

    expect(result.message).toBe('Por favor, informe um termo de busca com pelo menos 3 caracteres.');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('rejects whitespace-only search term', async () => {
    const result = await contatosHandler.handle('   ', {}, 1);

    expect(result.message).toBe('Por favor, informe um termo de busca com pelo menos 3 caracteres.');
    expect(result.nextStep).toBe(1);
  });

  it('rejects search term shorter than 3 characters', async () => {
    const result = await contatosHandler.handle('ab', {}, 1);

    expect(result.message).toBe('Por favor, informe um termo de busca com pelo menos 3 caracteres.');
    expect(result.nextStep).toBe(1);
  });

  it('accepts search term with exactly 3 characters and advances to step 2', async () => {
    const result = await contatosHandler.handle('abc', {}, 1);

    expect(result.nextStep).toBe(2);
    expect(result.updatedData).toEqual({ searchTerm: 'abc' });
  });

  it('accepts search term with 50 characters (upper boundary)', async () => {
    const term = 'A'.repeat(50);

    const result = await contatosHandler.handle(term, {}, 1);

    expect(result.nextStep).toBe(2);
    expect(result.updatedData).toEqual({ searchTerm: term });
  });

  it('rejects search term longer than 50 characters', async () => {
    const result = await contatosHandler.handle('A'.repeat(51), {}, 1);

    expect(result.message).toBe('Por favor, informe um termo de busca com pelo menos 3 caracteres.');
    expect(result.nextStep).toBe(1);
  });
});

// ─── Step 2: Search and display results ─────────────────────────
describe('/contatos — Step 2: Search and display results', () => {
  it('searches clients by name or phone (contains)', async () => {
    const clients = [mockClient()];
    vi.mocked(db.client.findMany).mockResolvedValue(clients);

    const result = await contatosHandler.handle('João', { searchTerm: 'João' }, 2);

    expect(db.client.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: 'João' } },
          { phone: { contains: 'João' } },
        ],
      },
    });
    expect(result.message).toContain('João Silva');
    expect(result.message).toContain('21999999999');
    expect(result.nextStep).toBeNull();
  });

  it('formats contact with #C1 prefix and active status', async () => {
    const clients = [mockClient()];
    vi.mocked(db.client.findMany).mockResolvedValue(clients);

    const result = await contatosHandler.handle('João', { searchTerm: 'João' }, 2);

    expect(result.message).toContain('#C1');
    expect(result.message).toContain('✅ Ativo');
  });

  it('shows inactive status for inactive clients', async () => {
    const clients = [mockClient({ active: false })];
    vi.mocked(db.client.findMany).mockResolvedValue(clients);

    const result = await contatosHandler.handle('João', { searchTerm: 'João' }, 2);

    expect(result.message).toContain('❌ Inativo');
  });

  it('shows "Nenhum contato encontrado" when no results', async () => {
    vi.mocked(db.client.findMany).mockResolvedValue([]);

    const result = await contatosHandler.handle('zzzzz', { searchTerm: 'zzzzz' }, 2);

    expect(result.message).toBe('Nenhum contato encontrado.');
    expect(result.nextStep).toBeNull();
    expect(result.updatedData).toEqual({});
  });

  it('shows "e mais N" when more than 5 results', async () => {
    const clients = Array.from({ length: 8 }, (_, i) =>
      mockClient({ id: `client-${i + 1}`, name: `Cliente ${i + 1}`, phone: `2199999999${i + 1}` })
    );
    vi.mocked(db.client.findMany).mockResolvedValue(clients);

    const result = await contatosHandler.handle('Cliente', { searchTerm: 'Cliente' }, 2);

    // Should list 5 and say "e mais 3"
    expect(result.message).toContain('e mais 3');
    expect(result.message).toContain('#C1');
    expect(result.message).toContain('#C5');
    expect(result.message).not.toContain('#C6');
  });

  it('shows exactly 5 results when exactly 5', async () => {
    const clients = Array.from({ length: 5 }, (_, i) =>
      mockClient({ id: `client-${i + 1}`, name: `Cliente ${i + 1}`, phone: `2199999999${i + 1}` })
    );
    vi.mocked(db.client.findMany).mockResolvedValue(clients);

    const result = await contatosHandler.handle('Cliente', { searchTerm: 'Cliente' }, 2);

    expect(result.message).toContain('#C5');
    expect(result.message).not.toContain('e mais');
    expect(result.nextStep).toBeNull();
  });

  it('handles DB error gracefully', async () => {
    vi.mocked(db.client.findMany).mockRejectedValue(new Error('DB error'));

    const result = await contatosHandler.handle('João', { searchTerm: 'João' }, 2);

    expect(result.message).toContain('Erro ao processar');
    expect(result.nextStep).toBeNull();
  });
});

// ─── Edge cases ─────────────────────────────────────────────────
describe('/contatos — Edge cases', () => {
  it('handles invalid step number gracefully', async () => {
    const result = await contatosHandler.handle('test', {}, 99);

    expect(result.message).toContain('Erro');
    expect(result.nextStep).toBeNull();
  });
});
