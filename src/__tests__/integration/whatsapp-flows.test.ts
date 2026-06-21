/**
 * Integration Tests — WhatsApp Flows (end-to-end via handleMessage)
 *
 * Tests the full flow from message input → flow orchestrator → flow handler
 * → Prisma entity creation, with Prisma mocked at the system boundary.
 * Uses the global mock from setup.ts for @/lib/db.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleMessage } from '@/lib/whatsapp/flowOrchestrator';
import { db } from '@/lib/db';

// ─── Helpers ─────────────────────────────────────────────────────────

const PHONE = '5511999999999';
const NOW = new Date();

/** Creates a minimal Prisma SessionResult shape for mocking db.commandSession */
function mockSession(command: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    phone: PHONE,
    command,
    step: 0,
    data: {},
    expiresAt: new Date(NOW.getTime() + 300_000),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** Creates a mock package for db.package.findMany */
function mockPkg(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pkg-1',
    name: 'Casamento Premium',
    description: 'Pacote completo de casamento',
    value: 15000,
    active: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** Creates a minimal client mock */
function mockClient(overrides: Record<string, unknown> = {}) {
  return { id: 'client-1', name: 'João Silva', phone: '21999999999', ...overrides };
}

/** Creates a minimal deal mock */
function mockDeal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'deal-1',
    clientId: 'client-1',
    packageId: 'pkg-1',
    title: 'Casamento Premium',
    value: 15000,
    status: 'new',
    currency: 'BRL',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** Clears all mocks before each test */
beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Helper: Run a full novoDeal conversation ────────────────────────

/**
 * Simulates the full /novodeal conversation through handleMessage.
 * Sets up Prisma mocks for each step and returns the final response.
 */
async function runNovoDealFlow(createProposal: boolean) {
  // Step 0: /novodeal command — no active session
  vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(null);
  vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 0 });
  vi.mocked(db.commandSession.create).mockResolvedValueOnce(
    mockSession('novodeal', { id: 's0', step: 0, data: {} })
  );
  vi.mocked(db.commandSession.update).mockResolvedValueOnce(
    mockSession('novodeal', { id: 's0', step: 1, data: {} })
  );

  const r0 = await handleMessage(PHONE, '/novodeal');
  expect(r0).toContain('Qual o nome do cliente?');

  // Step 1: Client name
  vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
    mockSession('novodeal', { id: 's0', step: 1, data: {} })
  );
  vi.mocked(db.commandSession.update).mockResolvedValueOnce(
    mockSession('novodeal', { id: 's0', step: 2, data: { clientName: 'João Silva' } })
  );

  const r1 = await handleMessage(PHONE, 'João Silva');
  expect(r1).toContain('telefone');

  // Step 2: Phone number — needs packages
  vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
    mockSession('novodeal', { id: 's0', step: 2, data: { clientName: 'João Silva' } })
  );
  vi.mocked(db.package.findMany).mockResolvedValueOnce([mockPkg()]);
  vi.mocked(db.commandSession.update).mockResolvedValueOnce(
    mockSession('novodeal', { id: 's0', step: 3, data: { clientName: 'João Silva', phone: '21999999999' } })
  );

  const r2 = await handleMessage(PHONE, '21999999999');
  expect(r2).toContain('Qual pacote');

  // Step 3: Select package
  vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
    mockSession('novodeal', { id: 's0', step: 3, data: { clientName: 'João Silva', phone: '21999999999' } })
  );
  vi.mocked(db.package.findMany).mockResolvedValueOnce([mockPkg()]);
  vi.mocked(db.commandSession.update).mockResolvedValueOnce(
    mockSession('novodeal', {
      id: 's0', step: 4,
      data: { clientName: 'João Silva', phone: '21999999999', packageName: 'Casamento Premium', packageId: 'pkg-1' },
    })
  );

  const r3 = await handleMessage(PHONE, 'Casamento Premium');
  expect(r3).toContain('Quer editar');

  // Step 4: Edit package — say não
  vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
    mockSession('novodeal', {
      id: 's0', step: 4,
      data: { clientName: 'João Silva', phone: '21999999999', packageName: 'Casamento Premium', packageId: 'pkg-1' },
    })
  );
  vi.mocked(db.commandSession.update).mockResolvedValueOnce(
    mockSession('novodeal', {
      id: 's0', step: 5,
      data: { clientName: 'João Silva', phone: '21999999999', packageName: 'Casamento Premium', packageId: 'pkg-1' },
    })
  );

  const r4 = await handleMessage(PHONE, 'não');
  expect(r4).toContain('criar uma proposta');

  // Step 5: Proposal question
  vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
    mockSession('novodeal', {
      id: 's0', step: 5,
      data: { clientName: 'João Silva', phone: '21999999999', packageName: 'Casamento Premium', packageId: 'pkg-1' },
    })
  );
  vi.mocked(db.commandSession.update).mockResolvedValueOnce(
    mockSession('novodeal', {
      id: 's0', step: 6,
      data: { clientName: 'João Silva', phone: '21999999999', packageName: 'Casamento Premium', packageId: 'pkg-1', createProposal },
    })
  );

  const r5 = await handleMessage(PHONE, createProposal ? 'sim' : 'não');
  expect(r5).toContain('Criando deal');

  // Step 6: Create entities
  const cl = mockClient({ name: 'João Silva', phone: '21999999999' });
  const dl = mockDeal({ clientId: 'client-1', packageId: 'pkg-1' });

  vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
    mockSession('novodeal', {
      id: 's0', step: 6,
      data: { clientName: 'João Silva', phone: '21999999999', packageName: 'Casamento Premium', packageId: 'pkg-1', createProposal },
    })
  );
  vi.mocked(db.client.create).mockResolvedValueOnce(cl);
  vi.mocked(db.deal.create).mockResolvedValueOnce(dl);

  if (createProposal) {
    vi.mocked(db.proposal.create).mockResolvedValueOnce({
      id: 'proposal-1', dealId: 'deal-1',
      createdAt: NOW, updatedAt: NOW,
      status: 'draft', totalValue: 15000, currency: 'BRL',
      clientId: 'client-1',
    });
  }

  vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 1 });

  const r6 = await handleMessage(PHONE, '');
  return r6;
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('WhatsApp Flows — Integration (end-to-end via handleMessage)', () => {
  // ─── 1. novoDeal: creates Client + Deal + Proposal ───────────────
  it('novoDeal: creates Client + Deal + Proposal when user says sim', async () => {
    const r6 = await runNovoDealFlow(true);

    expect(r6).toContain('Deal criado com sucesso');
    expect(r6).toContain('Proposta criada');
    expect(vi.mocked(db.client.create)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.deal.create)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.proposal.create)).toHaveBeenCalledTimes(1);
  });

  // ─── 2. novoDeal: does NOT create Proposal ──────────────────────
  it('novoDeal: does NOT create Proposal when user says não', async () => {
    const r6 = await runNovoDealFlow(false);

    expect(r6).toContain('Deal criado com sucesso');
    expect(r6).toContain('sem proposta');
    expect(vi.mocked(db.client.create)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.deal.create)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.proposal.create)).not.toHaveBeenCalled();
  });

  // ─── 3. despesa: creates Expense ────────────────────────────────
  it('despesa: creates Expense', async () => {
    // Step 0: /despesa command
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(null);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 0 });
    vi.mocked(db.commandSession.create).mockResolvedValueOnce(
      mockSession('despesa', { id: 's-desp', step: 0 })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('despesa', { id: 's-desp', step: 1 })
    );
    await handleMessage(PHONE, '/despesa');

    // Step 1: Project ID
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('despesa', { id: 's-desp', step: 1, data: {} })
    );
    vi.mocked(db.deal.findUnique).mockResolvedValueOnce(
      mockDeal({ id: 'deal-123', title: 'Casamento Premium' })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('despesa', { id: 's-desp', step: 2, data: { projectId: 'deal-123' } })
    );
    const r1 = await handleMessage(PHONE, '#deal-123');
    expect(r1).toContain('Casamento Premium');

    // Step 2: Value
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('despesa', { id: 's-desp', step: 2, data: { projectId: 'deal-123' } })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('despesa', { id: 's-desp', step: 3, data: { projectId: 'deal-123', amount: 5000 } })
    );
    const r2 = await handleMessage(PHONE, '5000');
    expect(r2).toContain('descrição');

    // Step 3: Description
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('despesa', { id: 's-desp', step: 3, data: { projectId: 'deal-123', amount: 5000 } })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('despesa', {
        id: 's-desp', step: 4,
        data: { projectId: 'deal-123', amount: 5000, description: 'Aluguel de equipamento' },
      })
    );
    const r3 = await handleMessage(PHONE, 'Aluguel de equipamento');
    expect(r3).toContain('categoria');

    // Step 4: Category — creates expense
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('despesa', {
        id: 's-desp', step: 4,
        data: { projectId: 'deal-123', amount: 5000, description: 'Aluguel de equipamento' },
      })
    );
    vi.mocked(db.expense.create).mockResolvedValueOnce({ id: 'expense-1', dealId: 'deal-123' });
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 1 });

    const r4 = await handleMessage(PHONE, 'equipamento');
    expect(r4).toContain('Despesa registrada com sucesso');
    expect(vi.mocked(db.expense.create)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.expense.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealId: 'deal-123',
          amount: 5000,
          category: 'equipamento',
        }),
      })
    );
  });

  // ─── 4. receita: creates Revenue ────────────────────────────────
  it('receita: creates Revenue', async () => {
    // Step 0: /receita command
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(null);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 0 });
    vi.mocked(db.commandSession.create).mockResolvedValueOnce(
      mockSession('receita', { id: 's-rec', step: 0 })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('receita', { id: 's-rec', step: 1 })
    );
    await handleMessage(PHONE, '/receita');

    // Step 1: Project ID
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('receita', { id: 's-rec', step: 1, data: {} })
    );
    vi.mocked(db.deal.findUnique).mockResolvedValueOnce(
      mockDeal({ id: 'deal-456' })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('receita', { id: 's-rec', step: 2, data: { projectId: 'deal-456' } })
    );
    await handleMessage(PHONE, 'deal-456');

    // Step 2: Value
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('receita', { id: 's-rec', step: 2, data: { projectId: 'deal-456' } })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('receita', { id: 's-rec', step: 3, data: { projectId: 'deal-456', amount: 10000 } })
    );
    await handleMessage(PHONE, '10000');

    // Step 3: Description
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('receita', { id: 's-rec', step: 3, data: { projectId: 'deal-456', amount: 10000 } })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('receita', {
        id: 's-rec', step: 4,
        data: { projectId: 'deal-456', amount: 10000, description: 'Pagamento entrada' },
      })
    );
    await handleMessage(PHONE, 'Pagamento entrada');

    // Step 4: Status
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('receita', {
        id: 's-rec', step: 4,
        data: { projectId: 'deal-456', amount: 10000, description: 'Pagamento entrada' },
      })
    );
    vi.mocked(db.revenue.create).mockResolvedValueOnce({ id: 'rev-1', dealId: 'deal-456' });
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 1 });

    const r4 = await handleMessage(PHONE, 'recebido');
    expect(r4).toContain('Receita registrada com sucesso');
    expect(vi.mocked(db.revenue.create)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.revenue.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealId: 'deal-456',
          amount: 10000,
          status: 'received',
        }),
      })
    );
  });

  // ─── 5. briefing: creates Briefing ──────────────────────────────
  it('briefing: creates Briefing', async () => {
    // Step 0: /briefing command
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(null);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 0 });
    vi.mocked(db.commandSession.create).mockResolvedValueOnce(
      mockSession('briefing', { id: 's-brf', step: 0 })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('briefing', { id: 's-brf', step: 1 })
    );
    await handleMessage(PHONE, '/briefing');

    // Step 1: Briefing text (step 0 just asks, no validation)
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('briefing', { id: 's-brf', step: 1, data: {} })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('briefing', {
        id: 's-brf', step: 2,
        data: { content: 'Casamento com 150 convidados, praia, cerimônia ao pôr do sol' },
      })
    );
    await handleMessage(PHONE, 'Casamento com 150 convidados, praia, cerimônia ao pôr do sol');

    // Step 2: Confirm creates briefing
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('briefing', {
        id: 's-brf', step: 2,
        data: { content: 'Casamento com 150 convidados, praia, cerimônia ao pôr do sol' },
      })
    );
    vi.mocked(db.briefing.create).mockResolvedValueOnce({ id: 'brief-1' });
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 1 });

    const r2 = await handleMessage(PHONE, 'confirmar');
    expect(r2).toContain('Briefing salvo');
    expect(vi.mocked(db.briefing.create)).toHaveBeenCalledTimes(1);
  });

  // ─── 6. status: returns deal summary ────────────────────────────
  it('status: returns deal summary', async () => {
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(null);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 0 });
    vi.mocked(db.commandSession.create).mockResolvedValueOnce(
      mockSession('status', { id: 's-st', step: 0 })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('status', { id: 's-st', step: 1 })
    );
    await handleMessage(PHONE, '/status');

    // Step 1: Show status
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('status', { id: 's-st', step: 1, data: {} })
    );
    vi.mocked(db.deal.findUnique).mockResolvedValueOnce(
      mockDeal({
        id: 'deal-789',
        title: 'Casamento Premium',
        value: 15000,
        status: 'new',
        client: { name: 'Maria', id: 'client-1' },
        briefings: [{ id: 'b1' }],
        proposals: [{ id: 'p1', status: 'draft' }],
        expenses: [{ amount: 3000 }],
        revenue: [{ amount: 10000, status: 'received' }],
      })
    );
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 1 });

    const r1 = await handleMessage(PHONE, 'deal-789');
    expect(r1).toContain('Casamento Premium');
    expect(r1).toContain('Maria');
    expect(r1).toContain('R$ 3.000');
    expect(r1).toContain('R$ 10.000');
    expect(r1).toContain('✅');
  });

  // ─── 7. contatos: returns contacts ──────────────────────────────
  it('contatos: returns contacts list', async () => {
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(null);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 0 });
    vi.mocked(db.commandSession.create).mockResolvedValueOnce(
      mockSession('contatos', { id: 's-ct', step: 0 })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('contatos', { id: 's-ct', step: 1 })
    );
    await handleMessage(PHONE, '/contatos');

    // Step 1: Search term
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('contatos', { id: 's-ct', step: 1, data: {} })
    );
    vi.mocked(db.client.findMany).mockResolvedValueOnce([
      { id: 'c1', name: 'Maria Silva', phone: '21988887777', active: true },
    ]);
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('contatos', { id: 's-ct', step: 2, data: { searchTerm: 'Maria' } })
    );
    await handleMessage(PHONE, 'Maria');

    // Step 2: Show results
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('contatos', { id: 's-ct', step: 2, data: { searchTerm: 'Maria' } })
    );
    vi.mocked(db.client.findMany).mockResolvedValueOnce([
      { id: 'c1', name: 'Maria Silva', phone: '21988887777', active: true },
    ]);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 1 });

    const r2 = await handleMessage(PHONE, '');
    expect(r2).toContain('Maria Silva');
    expect(r2).toContain('✅ Ativo');
  });

  // ─── 8. calendario: returns bookings ────────────────────────────
  it('calendario: returns bookings for today', async () => {
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(null);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 0 });
    vi.mocked(db.commandSession.create).mockResolvedValueOnce(
      mockSession('calendario', { id: 's-cal', step: 0 })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('calendario', { id: 's-cal', step: 1 })
    );
    await handleMessage(PHONE, '/calendario');

    // Step 1: Period
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('calendario', { id: 's-cal', step: 1, data: {} })
    );
    vi.mocked(db.booking.findMany).mockResolvedValueOnce([
      {
        id: 'b1',
        title: 'Casamento Maria & João',
        date: new Date(),
        status: 'confirmed',
        notes: 'Praia',
      },
    ]);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 1 });

    const r1 = await handleMessage(PHONE, 'hoje');
    expect(r1).toContain('Casamento Maria & João');
    expect(r1).toContain('🟢');
  });

  // ─── 9. Cleanup: session deleted after flow completion ─────────
  it('cleanup: session deleted after flow completion', async () => {
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(null);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 0 });
    vi.mocked(db.commandSession.create).mockResolvedValueOnce(
      mockSession('ajuda', { id: 's-ajuda', step: 0 })
    );
    // ajuda flow completes immediately (totalSteps=0), so no updateSession
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 1 });

    const result = await handleMessage(PHONE, '/ajuda');
    expect(result).toContain('/novoDeal');
    expect(result).toContain('/despesa');
    expect(vi.mocked(db.commandSession.deleteMany)).toHaveBeenCalledTimes(2);
  });

  // ─── 10. Cancel: /cancelar mid-flow deletes session ────────────
  it('/cancelar mid-flow deletes session and confirms cancellation', async () => {
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(null);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 0 });
    vi.mocked(db.commandSession.create).mockResolvedValueOnce(
      mockSession('novodeal', { id: 's-can', step: 0 })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('novodeal', { id: 's-can', step: 1 })
    );
    await handleMessage(PHONE, '/novodeal');

    // Now cancel
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('novodeal', { id: 's-can', step: 1 })
    );
    vi.mocked(db.commandSession.updateMany).mockResolvedValueOnce({ count: 1 });

    const result = await handleMessage(PHONE, '/cancelar');
    expect(result).toContain('cancelado');
    expect(vi.mocked(db.commandSession.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ phone: PHONE }),
        data: { expiresAt: expect.any(Date) },
      })
    );
  });

  // ─── 11. New command mid-flow replaces session ─────────────────
  it('new command mid-flow replaces session and starts new flow', async () => {
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(null);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 0 });
    vi.mocked(db.commandSession.create).mockResolvedValueOnce(
      mockSession('novodeal', { id: 's-old', step: 0 })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('novodeal', { id: 's-old', step: 1 })
    );
    await handleMessage(PHONE, '/novodeal');

    // Send new command /status mid-flow
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(
      mockSession('novodeal', { id: 's-old', step: 1 })
    );
    vi.mocked(db.commandSession.deleteMany).mockResolvedValueOnce({ count: 1 });
    vi.mocked(db.commandSession.create).mockResolvedValueOnce(
      mockSession('status', { id: 's-new', step: 0 })
    );
    vi.mocked(db.commandSession.update).mockResolvedValueOnce(
      mockSession('status', { id: 's-new', step: 1 })
    );

    const result = await handleMessage(PHONE, '/status');
    expect(result).toContain('Qual o ID do projeto');
    expect(vi.mocked(db.commandSession.deleteMany)).toHaveBeenCalled();
    expect(vi.mocked(db.commandSession.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ command: 'status' }) })
    );
  });

  // ─── 12. Empty message when no session ─────────────────────────
  it('empty response when no session and no command', async () => {
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(null);
    const result = await handleMessage(PHONE, 'mensagem qualquer');
    expect(result).toBe('');
  });

  // ─── 13. Unknown command returns empty ─────────────────────────
  it('empty response for unknown command with no session', async () => {
    vi.mocked(db.commandSession.findFirst).mockResolvedValueOnce(null);
    const result = await handleMessage(PHONE, '/foo');
    expect(result).toBe('');
  });
});
