/**
 * API Integration Tests — Deal [id] route
 *
 * Testa os handlers GET/PUT/DELETE do /api/deals/[id] atraves da interface HTTP.
 * Faz mock do Prisma no limite do sistema (diretriz TDD).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/deals/[id]/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

const mockDealFindUnique = vi.mocked(db.deal.findUnique);
const mockDealUpdate = vi.mocked(db.deal.update);
const mockBriefingDeleteMany = vi.mocked(db.briefing.deleteMany);
const mockExpenseDeleteMany = vi.mocked(db.expense.deleteMany);
const mockRevenueDeleteMany = vi.mocked(db.revenue.deleteMany);
const mockBookingDeleteMany = vi.mocked(db.booking.deleteMany);
const mockDocumentDeleteMany = vi.mocked(db.document.deleteMany);
const mockDealDelete = vi.mocked(db.deal.delete);
const mockTransaction = vi.mocked(db.$transaction);

// Helper para construir o segundo argumento { params } dos handlers [id]
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/deals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  it('returns deal with computed stats (totalExpenses, totalRevenue, profit)', async () => {
    const mockDeal = {
      id: 'deal_1',
      clientId: 'cl_1',
      title: 'Wedding Package',
      description: 'Full wedding coverage',
      status: 'new',
      value: 8000,
      currency: 'BRL',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      client: { id: 'cl_1', name: 'Alice', phone: '+5511' },
      briefings: [],
      expenses: [{ amount: 500 }, { amount: 200 }],
      revenue: [
        { amount: 3000, status: 'received' },
        { amount: 2000, status: 'pending' },
      ],
      bookings: [],
      documents: [],
    };
    mockDealFindUnique.mockResolvedValue(mockDeal as any);

    const request = new NextRequest('http://localhost/api/deals/deal_1');
    const response = await GET(request, makeParams('deal_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('Wedding Package');
    expect(data.totalExpenses).toBe(700); // 500 + 200
    expect(data.totalRevenue).toBe(3000); // apenas receitas received
    expect(data.profit).toBe(2300); // 3000 - 700
    expect(mockDealFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'deal_1' },
      })
    );
  });

  it('returns 404 when deal not found', async () => {
    mockDealFindUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/deals/missing');
    const response = await GET(request, makeParams('missing'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Deal not found');
  });

  it('returns 500 on DB error', async () => {
    mockDealFindUnique.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/deals/deal_1');
    const response = await GET(request, makeParams('deal_1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch deal');
  });
});

describe('PUT /api/deals/[id]', () => {
  const validBody = {
    title: 'Updated Title',
    description: 'Updated description',
    status: 'quoting',
    value: 12000,
    currency: 'BRL',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  it('updates deal with validated fields', async () => {
    const updatedDeal = {
      id: 'deal_1',
      clientId: 'cl_1',
      title: 'Updated Title',
      description: 'Updated description',
      status: 'quoting',
      value: 12000,
      currency: 'BRL',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      client: { id: 'cl_1', name: 'Alice' },
    };
    mockDealUpdate.mockResolvedValue(updatedDeal as any);

    const request = new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await PUT(request, makeParams('deal_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('Updated Title');
    expect(data.client).toBeDefined();
    expect(mockDealUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'deal_1' },
        data: expect.objectContaining({
          title: 'Updated Title',
          status: 'quoting',
          value: 12000,
          currency: 'BRL',
        }),
        include: { client: true },
      })
    );
  });

  it('whitelists only safe fields (no clientId)', async () => {
    const updatedDeal = {
      id: 'deal_1',
      clientId: 'cl_1',
      title: 'Updated',
      description: null,
      status: 'new',
      value: 0,
      currency: 'BRL',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      client: { id: 'cl_1', name: 'Alice' },
    };
    mockDealUpdate.mockResolvedValue(updatedDeal as any);

    // Tenta injetar clientId e outros campos perigosos via mass assignment
    const maliciousBody = {
      ...validBody,
      clientId: 'cl_evil',
      id: 'deal_evil',
      createdAt: '1999-01-01T00:00:00Z',
    };
    const request = new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(maliciousBody),
    });
    const response = await PUT(request, makeParams('deal_1'));

    expect(response.status).toBe(200);
    // Os campos nao-whitelisted nao devem ser repassados para o Prisma
    expect(mockDealUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ clientId: 'cl_evil' }),
      })
    );
    expect(mockDealUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ id: 'deal_evil' }),
      })
    );
  });

  it('returns 422 on invalid data', async () => {
    // value negativo viola o schema dealUpdateSchema (min(0))
    const request = new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, value: -100 }),
    });
    const response = await PUT(request, makeParams('deal_1'));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
    expect(mockDealUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 on DB error', async () => {
    mockDealUpdate.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await PUT(request, makeParams('deal_1'));

    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/deals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';

    // Cada operacao em cascata retorna uma Promise (count / registro deletado)
    mockBriefingDeleteMany.mockResolvedValue({ count: 2 });
    mockExpenseDeleteMany.mockResolvedValue({ count: 3 });
    mockRevenueDeleteMany.mockResolvedValue({ count: 4 });
    mockBookingDeleteMany.mockResolvedValue({ count: 1 });
    mockDocumentDeleteMany.mockResolvedValue({ count: 5 });
    mockDealDelete.mockResolvedValue({ id: 'deal_1' });

    // $transaction com array de Promises resolve para o array de resultados
    mockTransaction.mockResolvedValue([
      { count: 2 },
      { count: 3 },
      { count: 4 },
      { count: 1 },
      { count: 5 },
      { id: 'deal_1' },
    ] as any);
  });

  it('cascades deletion via $transaction', async () => {
    const request = new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('deal_1'));

    expect(response.status).toBe(200);

    // Todas as exclusoes em cascata foram invocadas com o dealId correto
    expect(mockBriefingDeleteMany).toHaveBeenCalledWith({ where: { dealId: 'deal_1' } });
    expect(mockExpenseDeleteMany).toHaveBeenCalledWith({ where: { dealId: 'deal_1' } });
    expect(mockRevenueDeleteMany).toHaveBeenCalledWith({ where: { dealId: 'deal_1' } });
    expect(mockBookingDeleteMany).toHaveBeenCalledWith({ where: { dealId: 'deal_1' } });
    expect(mockDocumentDeleteMany).toHaveBeenCalledWith({ where: { dealId: 'deal_1' } });
    expect(mockDealDelete).toHaveBeenCalledWith({ where: { id: 'deal_1' } });

    // Tudo encapsulado em uma unica transacao com 6 operacoes em cascata
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    const txArgs = mockTransaction.mock.calls[0][0];
    expect(Array.isArray(txArgs)).toBe(true);
    expect(txArgs).toHaveLength(6);
    expect(txArgs.every((p: unknown) => p instanceof Promise)).toBe(true);
  });

  it('returns { success: true }', async () => {
    const request = new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('deal_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it('returns 500 on DB error', async () => {
    mockTransaction.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('deal_1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete deal');
  });
});
