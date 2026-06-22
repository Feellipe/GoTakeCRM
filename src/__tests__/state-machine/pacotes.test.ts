import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { pacotesHandler } from '@/lib/whatsapp/flows/pacotes';

const mockPackage = (overrides: Record<string, unknown> = {}) => ({
  id: 'pkg-1',
  name: 'Casamento Premium',
  description: 'Pacote completo de casamento',
  value: 15000,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── FlowHandler interface ──────────────────────────────────────
describe('/pacotes — FlowHandler interface', () => {
  it('exports command as "pacotes"', () => {
    expect(pacotesHandler.command).toBe('pacotes');
  });

  it('exports totalSteps as 2', () => {
    expect(pacotesHandler.totalSteps).toBe(2);
  });
});

// ─── Step 0: Ask "Ativos ou todos?" ─────────────────────────────
describe('/pacotes — Step 0: Ask filter', () => {
  it('asks "Ativos ou todos?" on first call', async () => {
    const result = await pacotesHandler.handle('', {}, 0, 'org-1');

    expect(result.message).toContain('ativos');
    expect(result.message).toContain('todos');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('ignores any input text at step 0', async () => {
    const result = await pacotesHandler.handle('qualquer coisa', {}, 0, 'org-1');

    expect(result.nextStep).toBe(1);
  });
});

// ─── Step 1: Filter and show packages ───────────────────────────
describe('/pacotes — Step 1: List packages', () => {
  it('filters active packages when user says "ativos"', async () => {
    const packages = [
      mockPackage({ id: 'pkg-1', name: 'Casamento Premium', value: 15000, active: true }),
      mockPackage({ id: 'pkg-2', name: 'Casamento Básico', value: 5000, active: true }),
    ];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await pacotesHandler.handle('ativos', {}, 1, 'org-1');

    expect(db.package.findMany).toHaveBeenCalledWith({
      where: { active: true, organizationId: 'org-1' },
    });
    expect(result.message).toContain('Casamento Premium');
    expect(result.message).toContain('Casamento Básico');
    expect(result.message).toContain('R$ 15.000');
    expect(result.message).toContain('R$ 5.000');
    expect(result.nextStep).toBeNull();
  });

  it('shows all packages when user says "todos"', async () => {
    const packages = [
      mockPackage({ id: 'pkg-1', name: 'Casamento Premium', value: 15000, active: true }),
      mockPackage({ id: 'pkg-2', name: 'Pacote Antigo', value: 1000, active: false }),
    ];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await pacotesHandler.handle('todos', {}, 1, 'org-1');

    expect(db.package.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
    });
    expect(result.message).toContain('Casamento Premium');
    expect(result.message).toContain('Pacote Antigo');
    expect(result.nextStep).toBeNull();
  });

  it('accepts "Ativos" with mixed case', async () => {
    vi.mocked(db.package.findMany).mockResolvedValue([]);

    const result = await pacotesHandler.handle('Ativos', {}, 1, 'org-1');

    expect(db.package.findMany).toHaveBeenCalled();
    expect(result.nextStep).toBeNull();
  });

  it('shows "Nenhum pacote cadastrado" when no results', async () => {
    vi.mocked(db.package.findMany).mockResolvedValue([]);

    const result = await pacotesHandler.handle('ativos', {}, 1, 'org-1');

    expect(result.message).toBe('Nenhum pacote cadastrado.');
    expect(result.nextStep).toBeNull();
    expect(result.updatedData).toEqual({});
  });

  it('rejects invalid filter input', async () => {
    const result = await pacotesHandler.handle('invalido', {}, 1, 'org-1');

    expect(result.message).toBe('Por favor, responda "ativos" ou "todos".');
    expect(result.nextStep).toBe(1);
  });

  it('handles DB error gracefully', async () => {
    vi.mocked(db.package.findMany).mockRejectedValue(new Error('DB error'));

    const result = await pacotesHandler.handle('ativos', {}, 1, 'org-1');

    expect(result.message).toContain('Erro ao processar');
    expect(result.nextStep).toBeNull();
  });
});

// ─── Edge cases ─────────────────────────────────────────────────
describe('/pacotes — Edge cases', () => {
  it('handles invalid step number gracefully', async () => {
    const result = await pacotesHandler.handle('test', {}, 99, 'org-1');

    expect(result.message).toContain('Erro');
    expect(result.nextStep).toBeNull();
  });
});
