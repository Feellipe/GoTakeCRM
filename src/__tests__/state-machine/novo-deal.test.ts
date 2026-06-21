import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { novoDealHandler } from '@/lib/whatsapp/flows/novoDeal';

// Helper: typed mock helpers
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

// ─── Step 0: Ask name ──────────────────────────────────────────────
describe('novoDeal — Step 0: Ask client name', () => {
  it('asks for client name on first call (input ignored)', async () => {
    const result = await novoDealHandler.handle('', {}, 0);

    expect(result.message).toBe('Qual o nome do cliente?');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('ignores any input text at step 0', async () => {
    const result = await novoDealHandler.handle('João', {}, 0);

    expect(result.message).toBe('Qual o nome do cliente?');
    expect(result.nextStep).toBe(1);
  });
});

// ─── Step 1: Receive name, ask phone ──────────────────────────────
describe('novoDeal — Step 1: Receive client name', () => {
  it('accepts a valid client name and asks for phone', async () => {
    const result = await novoDealHandler.handle('João Silva', {}, 1);

    expect(result.message).toBe('Qual o telefone do(a) João Silva?');
    expect(result.nextStep).toBe(2);
    expect(result.updatedData).toEqual({ clientName: 'João Silva' });
  });

  it('rejects empty name', async () => {
    const result = await novoDealHandler.handle('', {}, 1);

    expect(result.message).toBe('Por favor, informe um nome válido.');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('rejects whitespace-only name', async () => {
    const result = await novoDealHandler.handle('   ', {}, 1);

    expect(result.message).toBe('Por favor, informe um nome válido.');
    expect(result.nextStep).toBe(1);
  });

  it('accepts name with exactly 1 character (boundary)', async () => {
    const result = await novoDealHandler.handle('A', {}, 1);

    expect(result.message).toBe('Qual o telefone do(a) A?');
    expect(result.nextStep).toBe(2);
    expect(result.updatedData).toEqual({ clientName: 'A' });
  });

  it('accepts name with exactly 200 characters (boundary)', async () => {
    const name = 'A'.repeat(200);
    const result = await novoDealHandler.handle(name, {}, 1);

    expect(result.nextStep).toBe(2);
    expect(result.updatedData).toEqual({ clientName: name });
  });

  it('rejects name longer than 200 characters (boundary)', async () => {
    const name = 'A'.repeat(201);
    const result = await novoDealHandler.handle(name, {}, 1);

    expect(result.message).toBe('Por favor, informe um nome válido.');
    expect(result.nextStep).toBe(1);
  });
});

// ─── Step 2: Receive phone, list packages ─────────────────────────
describe('novoDeal — Step 2: Receive phone number', () => {
  it('strips BR formatting (21)99999-9999 → 10 digits and lists packages', async () => {
    const packages = [mockPackage()];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle(
      '(21) 99999-9999',
      { clientName: 'João' },
      2
    );

    expect(result.updatedData).toEqual({ phone: '21999999999' });
    expect(result.nextStep).toBe(3);
    expect(result.message).toContain('Qual pacote?');
    expect(result.message).toContain('Casamento Premium');
  });

  it('strips +55 and spaces from phone (BR full format)', async () => {
    const packages = [mockPackage()];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle(
      '+55 21 99999-9999',
      { clientName: 'João' },
      2
    );

    // +55 is kept as part of the 13-digit phone (country code is valid)
    expect(result.updatedData).toEqual({ phone: '5521999999999' });
    expect(result.nextStep).toBe(3);
  });

  it('accepts 10 digits (landline)', async () => {
    const packages = [mockPackage()];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle(
      '21 9999-9999',
      { clientName: 'João' },
      2
    );

    expect(result.updatedData).toEqual({ phone: '2199999999' });
    expect(result.nextStep).toBe(3);
  });

  it('accepts 13 digits (full with country code)', async () => {
    const packages = [mockPackage()];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle(
      '+5521999999999',
      { clientName: 'João' },
      2
    );

    expect(result.updatedData).toEqual({ phone: '5521999999999' });
    expect(result.nextStep).toBe(3);
  });

  it('rejects phone with fewer than 10 digits after formatting', async () => {
    const result = await novoDealHandler.handle(
      '9999-9999',
      { clientName: 'João' },
      2
    );

    expect(result.message).toBe('Por favor, informe um telefone válido (10 a 13 dígitos).');
    expect(result.nextStep).toBe(2);
  });

  it('rejects phone with more than 13 digits after formatting', async () => {
    const result = await novoDealHandler.handle(
      '551219999999999',
      { clientName: 'João' },
      2
    );

    expect(result.message).toBe('Por favor, informe um telefone válido (10 a 13 dígitos).');
    expect(result.nextStep).toBe(2);
  });

  it('accepts exactly 10 digits (lower boundary)', async () => {
    const packages = [mockPackage()];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle(
      '2199999999',
      { clientName: 'João' },
      2
    );

    expect(result.updatedData).toEqual({ phone: '2199999999' });
    expect(result.nextStep).toBe(3);
  });

  it('accepts exactly 13 digits (upper boundary)', async () => {
    const packages = [mockPackage()];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle(
      '5521999999999',
      { clientName: 'João' },
      2
    );

    expect(result.updatedData).toEqual({ phone: '5521999999999' });
    expect(result.nextStep).toBe(3);
  });

  it('lists multiple packages with numbered options', async () => {
    const packages = [
      mockPackage({ id: 'pkg-1', name: 'Casamento Premium', value: 15000 }),
      mockPackage({ id: 'pkg-2', name: 'Casamento Básico', value: 5000 }),
    ];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle(
      '21999999999',
      { clientName: 'João' },
      2
    );

    expect(result.message).toContain('Casamento Premium');
    expect(result.message).toContain('Casamento Básico');
    expect(result.message).toContain('R$ 15.000');
    expect(result.message).toContain('R$ 5.000');
  });

  it('handles no packages found gracefully', async () => {
    vi.mocked(db.package.findMany).mockResolvedValue([]);

    const result = await novoDealHandler.handle(
      '21999999999',
      { clientName: 'João' },
      2
    );

    expect(result.message).toBe('Nenhum pacote cadastrado no momento. Encerrando fluxo.');
    expect(result.nextStep).toBeNull();
  });
});

// ─── Step 3: Select package ──────────────────────────────────────
describe('novoDeal — Step 3: Select package', () => {
  const dataWithPhone = {
    clientName: 'João',
    phone: '21999999999',
  };

  it('finds package by exact name (case-insensitive)', async () => {
    const packages = [mockPackage({ id: 'pkg-1', name: 'Casamento Premium' })];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle(
      'casamento premium',
      dataWithPhone,
      3
    );

    expect(result.updatedData).toMatchObject({
      packageName: 'Casamento Premium',
      packageId: 'pkg-1',
    });
    expect(result.nextStep).toBe(4);
    expect(result.message).toBe('Quer editar o pacote? (sim/não)');
  });

  it('finds package by partial match (prefix)', async () => {
    const packages = [mockPackage({ id: 'pkg-1', name: 'Casamento Premium' })];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle('casamento', dataWithPhone, 3);

    expect(result.updatedData).toMatchObject({
      packageName: 'Casamento Premium',
      packageId: 'pkg-1',
    });
    expect(result.nextStep).toBe(4);
  });

  it('finds package by partial match (substring, case-insensitive)', async () => {
    const packages = [mockPackage({ id: 'pkg-1', name: 'Casamento Premium' })];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle('PREMIUM', dataWithPhone, 3);

    expect(result.updatedData).toMatchObject({
      packageName: 'Casamento Premium',
      packageId: 'pkg-1',
    });
    expect(result.nextStep).toBe(4);
  });

  it('shows error message when package not found and stays at step 3', async () => {
    const packages = [mockPackage({ id: 'pkg-1', name: 'Casamento Premium' })];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle('Festa Infantil', dataWithPhone, 3);

    expect(result.message).toBe(
      'Pacote não encontrado. Os pacotes disponíveis são:\nCasamento Premium'
    );
    expect(result.nextStep).toBe(3);
    expect(result.updatedData).toEqual({});
  });

  it('shows error with multiple available packages when not found', async () => {
    const packages = [
      mockPackage({ id: 'pkg-1', name: 'Casamento Premium' }),
      mockPackage({ id: 'pkg-2', name: 'Casamento Básico' }),
    ];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle('Festa', dataWithPhone, 3);

    expect(result.message).toContain('Casamento Premium');
    expect(result.message).toContain('Casamento Básico');
    expect(result.nextStep).toBe(3);
  });

  it('selects from multiple packages correctly (second package matched)', async () => {
    const packages = [
      mockPackage({ id: 'pkg-1', name: 'Casamento Premium' }),
      mockPackage({ id: 'pkg-2', name: 'Casamento Básico' }),
    ];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle('Básico', dataWithPhone, 3);

    expect(result.updatedData).toMatchObject({
      packageName: 'Casamento Básico',
      packageId: 'pkg-2',
    });
    expect(result.nextStep).toBe(4);
  });
});

// ─── Step 4: Edit package (Decision Table) ─────────────────────
describe('novoDeal — Step 4: Edit package (Decision Table)', () => {
  const dataWithPackage = {
    clientName: 'João',
    phone: '21999999999',
    packageName: 'Casamento Premium',
    packageId: 'pkg-1',
  };

  it('enters no edit → proceeds to step 5 (proposal question)', async () => {
    const result = await novoDealHandler.handle('não', dataWithPackage, 4);

    expect(result.message).toBe('Deseja criar uma proposta? (sim/não)');
    expect(result.nextStep).toBe(5);
    expect(result.updatedData).toEqual(dataWithPackage);
  });

  it('enters não with capital N → proceeds to step 5', async () => {
    const result = await novoDealHandler.handle('Não', dataWithPackage, 4);

    expect(result.nextStep).toBe(5);
  });

  it('enters "sim" → asks what to edit (valor/descrição)', async () => {
    const result = await novoDealHandler.handle('sim', dataWithPackage, 4);

    expect(result.message).toBe('O que quer editar? (valor/descrição)');
    expect(result.nextStep).toBe(4);
    expect(result.updatedData).toEqual({
      ...dataWithPackage,
      editing: true,
    });
  });

  it('editing=true + "valor" → asks for new value', async () => {
    const result = await novoDealHandler.handle(
      'valor',
      { ...dataWithPackage, editing: true },
      4
    );

    expect(result.message).toBe('Qual o novo valor?');
    expect(result.nextStep).toBe(4);
    expect(result.updatedData).toEqual({
      ...dataWithPackage,
      editing: true,
      editField: 'valor',
    });
  });

  it('editing=true + "descrição" → asks for new description', async () => {
    const result = await novoDealHandler.handle(
      'descrição',
      { ...dataWithPackage, editing: true },
      4
    );

    expect(result.message).toBe('Qual a nova descrição?');
    expect(result.nextStep).toBe(4);
    expect(result.updatedData).toEqual({
      ...dataWithPackage,
      editing: true,
      editField: 'descrição',
    });
  });

  it('after editing field "valor", valid input saves and advances', async () => {
    const result = await novoDealHandler.handle(
      '15000',
      { ...dataWithPackage, editing: true, editField: 'valor' },
      4
    );

    expect(result.updatedData).toMatchObject({
      packageName: 'Casamento Premium',
      packageId: 'pkg-1',
      packageValue: 15000,
    });
    expect(result.updatedData).not.toHaveProperty('editing');
    expect(result.updatedData).not.toHaveProperty('editField');
    expect(result.nextStep).toBe(5);
  });

  it('after editing field "descrição", saves and advances', async () => {
    const result = await novoDealHandler.handle(
      'Nova descrição personalizada',
      { ...dataWithPackage, editing: true, editField: 'descrição' },
      4
    );

    expect(result.updatedData).toMatchObject({
      packageName: 'Casamento Premium',
      packageId: 'pkg-1',
      packageDescription: 'Nova descrição personalizada',
    });
    expect(result.nextStep).toBe(5);
  });

  it('invalid edit option (not valor/descrição) stays in edit', async () => {
    const result = await novoDealHandler.handle(
      'preço',
      { ...dataWithPackage, editing: true },
      4
    );

    expect(result.message).toBe('Opção inválida. Escolha "valor" ou "descrição".');
    expect(result.nextStep).toBe(4);
  });

  it('invalid response to edit question (not sim/não) stays at step 4', async () => {
    const result = await novoDealHandler.handle('talvez', dataWithPackage, 4);

    expect(result.message).toBe('Por favor, responda "sim" ou "não".');
    expect(result.nextStep).toBe(4);
  });
});

// ─── Step 5: Create proposal question ──────────────────────────
describe('novoDeal — Step 5: Ask about creating a proposal', () => {
  const dataReady = {
    clientName: 'João',
    phone: '21999999999',
    packageName: 'Casamento Premium',
    packageId: 'pkg-1',
  };

  it('"sim" → sets createProposal=true and advances to step 6', async () => {
    const result = await novoDealHandler.handle('sim', dataReady, 5);

    expect(result.message).toBe('Criando deal e registrando tudo...');
    expect(result.nextStep).toBe(6);
    expect(result.updatedData).toEqual({
      ...dataReady,
      createProposal: true,
    });
  });

  it('"não" → sets createProposal=false and advances to step 6', async () => {
    const result = await novoDealHandler.handle('não', dataReady, 5);

    expect(result.message).toBe('Criando deal e registrando tudo...');
    expect(result.nextStep).toBe(6);
    expect(result.updatedData).toEqual({
      ...dataReady,
      createProposal: false,
    });
  });

  it('anything else → stays at step 5 with error message', async () => {
    const result = await novoDealHandler.handle('talvez', dataReady, 5);

    expect(result.message).toBe('Por favor, responda "sim" ou "não".');
    expect(result.nextStep).toBe(5);
  });
});

// ─── Step 6: Complete — Create entities ─────────────────────────
describe('novoDeal — Step 6: Create entities', () => {
  const dataForCreation = {
    clientName: 'João Silva',
    phone: '21999999999',
    packageName: 'Casamento Premium',
    packageId: 'pkg-1',
    createProposal: true,
  };

  it('creates Client, Deal, Proposal, and deletes session', async () => {
    const mockClient = { id: 'client-1', name: 'João Silva', phone: '21999999999' };
    const mockDeal = { id: 'deal-1', clientId: 'client-1', packageId: 'pkg-1' };
    const mockProposal = { id: 'prop-1', dealId: 'deal-1' };

    vi.mocked(db.client.create).mockResolvedValue(mockClient);
    vi.mocked(db.deal.create).mockResolvedValue(mockDeal);
    vi.mocked(db.proposal.create).mockResolvedValue(mockProposal);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValue({ count: 1 });

    const result = await novoDealHandler.handle('', dataForCreation, 6);

    expect(db.client.create).toHaveBeenCalledWith({
      data: { name: 'João Silva', phone: '21999999999' },
    });
    expect(db.deal.create).toHaveBeenCalledWith({
      data: {
        clientId: 'client-1',
        packageId: 'pkg-1',
        packageValue: undefined,
        packageDescription: undefined,
      },
    });
    expect(db.proposal.create).toHaveBeenCalledWith({
      data: { dealId: 'deal-1' },
    });
    expect(db.commandSession.deleteMany).toHaveBeenCalledWith({
      where: { phone: '21999999999' },
    });

    expect(result.message).toContain('Deal criado com sucesso');
    expect(result.message).toContain('João Silva');
    expect(result.message).toContain('Casamento Premium');
    expect(result.message).toContain('Proposta criada');
    expect(result.nextStep).toBeNull();
    expect(result.result).toBeDefined();
    expect(result.result!.action).toBe('create_entities');
    expect(result.result!.entities).toMatchObject({
      clientId: 'client-1',
      dealId: 'deal-1',
      proposalId: 'prop-1',
    });
  });

  it('creates only Client and Deal when createProposal is false', async () => {
    const dataNoProposal = { ...dataForCreation, createProposal: false };
    const mockClient = { id: 'client-2', name: 'João Silva', phone: '21999999999' };
    const mockDeal = { id: 'deal-2', clientId: 'client-2' };

    vi.mocked(db.client.create).mockResolvedValue(mockClient);
    vi.mocked(db.deal.create).mockResolvedValue(mockDeal);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValue({ count: 1 });

    const result = await novoDealHandler.handle('', dataNoProposal, 6);

    expect(db.client.create).toHaveBeenCalledOnce();
    expect(db.deal.create).toHaveBeenCalledOnce();
    expect(db.proposal.create).not.toHaveBeenCalled();
    expect(result.message).toContain('sem proposta');
    expect(result.message).not.toContain('proposta criada');
    expect(result.nextStep).toBeNull();
  });

  it('includes edited package value and description in deal creation', async () => {
    const dataWithEdits = {
      ...dataForCreation,
      packageValue: 18000,
      packageDescription: 'Pacote editado com decoração extra',
    };
    const mockClient = { id: 'client-3', name: 'João Silva', phone: '21999999999' };
    const mockDeal = { id: 'deal-3', clientId: 'client-3' };
    const mockProposal = { id: 'prop-3', dealId: 'deal-3' };

    vi.mocked(db.client.create).mockResolvedValue(mockClient);
    vi.mocked(db.deal.create).mockResolvedValue(mockDeal);
    vi.mocked(db.proposal.create).mockResolvedValue(mockProposal);
    vi.mocked(db.commandSession.deleteMany).mockResolvedValue({ count: 1 });

    await novoDealHandler.handle('', dataWithEdits, 6);

    expect(db.deal.create).toHaveBeenCalledWith({
      data: {
        clientId: 'client-3',
        packageId: 'pkg-1',
        packageValue: 18000,
        packageDescription: 'Pacote editado com decoração extra',
      },
    });
  });

  it('handles DB error on client creation gracefully', async () => {
    vi.mocked(db.client.create).mockRejectedValue(new Error('Database connection error'));

    const result = await novoDealHandler.handle('', dataForCreation, 6);

    expect(result.message).toContain('Erro ao criar');
    expect(result.nextStep).toBeNull();
  });

  it('does not delete session when entity creation fails', async () => {
    vi.mocked(db.client.create).mockRejectedValue(new Error('DB error'));

    await novoDealHandler.handle('', dataForCreation, 6);

    expect(db.commandSession.deleteMany).not.toHaveBeenCalled();
  });
});

// ─── Edge cases ─────────────────────────────────────────────────
describe('novoDeal — Edge cases', () => {
  it('handles invalid step number gracefully', async () => {
    const result = await novoDealHandler.handle('test', {}, 99);

    expect(result.message).toContain('Erro');
    expect(result.nextStep).toBeNull();
  });

  it('handles phone with R$ prefix (mistaken value entry)', async () => {
    const packages = [mockPackage()];
    vi.mocked(db.package.findMany).mockResolvedValue(packages);

    const result = await novoDealHandler.handle(
      'R$ 4.500,50',
      { clientName: 'João' },
      2
    );

    // Should strip non-digit characters — "450050" is only 6 digits (too short)
    // phone is preserved in updatedData even though validation fails
    expect(result.updatedData).toEqual({ phone: '450050' });
    expect(result.nextStep).toBe(2);
    expect(result.message).toContain('válido');
  });
});

// ─── FlowHandler interface ──────────────────────────────────────
describe('novoDeal — FlowHandler interface', () => {
  it('exports command as "novodeal"', () => {
    expect(novoDealHandler.command).toBe('novodeal');
  });

  it('exports totalSteps as 7', () => {
    expect(novoDealHandler.totalSteps).toBe(7);
  });
});
