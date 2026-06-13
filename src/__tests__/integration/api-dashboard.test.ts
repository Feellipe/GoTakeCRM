/**
 * API Integration Tests — Dashboard
 *
 * Tests the GET /api/dashboard route handler through the HTTP interface.
 * Mocks Prisma at the system boundary (per TDD guidelines).
 * Exercises the aggregation pipeline: KPIs, dealsByStatus, monthlyRevenue,
 * expensesByCategory, upcomingBookings, recentDeals, topClients e pipeline.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/dashboard/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

// Acesso as funcoes mockadas
const mockDealFindMany = vi.mocked(db.deal.findMany);
const mockClientFindMany = vi.mocked(db.client.findMany);
const mockBookingFindMany = vi.mocked(db.booking.findMany);
const mockExpenseFindMany = vi.mocked(db.expense.findMany);
const mockRevenueFindMany = vi.mocked(db.revenue.findMany);
const mockRevenueAggregate = vi.mocked(db.revenue.aggregate);
const mockExpenseAggregate = vi.mocked(db.expense.aggregate);
const mockDealAggregate = vi.mocked(db.deal.aggregate);
const mockClientCount = vi.mocked(db.client.count);
const mockDealCount = vi.mocked(db.deal.count);
const mockDealGroupBy = vi.mocked(db.deal.groupBy);
const mockExpenseGroupBy = vi.mocked(db.expense.groupBy);

/**
 * Configura todos os mocks do Prisma com valores realistas minimos.
 * Centraliza o setup porque o endpoint dispara 13 chamadas em paralelo.
 */
function setupMocks(overrides: Partial<{
  deals: ReturnType<typeof buildDeals>;
  expenses: ReturnType<typeof buildExpenses>;
  revenue: ReturnType<typeof buildRevenue>;
}> = {}) {
  const deals = overrides.deals ?? buildDeals();
  const expenses = overrides.expenses ?? buildExpenses();
  const revenue = overrides.revenue ?? buildRevenue();

  mockDealFindMany.mockResolvedValue(deals);
  mockClientFindMany.mockResolvedValue(buildClients());
  mockBookingFindMany.mockResolvedValue(buildBookings());
  mockExpenseFindMany.mockResolvedValue(expenses);
  mockRevenueFindMany.mockResolvedValue(revenue);

  mockRevenueAggregate.mockResolvedValue({ _sum: { amount: 5000 }, _avg: { amount: null }, _count: { amount: 2 }, _min: { amount: null }, _max: { amount: null } });
  mockExpenseAggregate.mockResolvedValue({ _sum: { amount: 1500 }, _avg: { amount: null }, _count: { amount: 2 }, _min: { amount: null }, _max: { amount: null } });
  mockDealAggregate.mockResolvedValue({ _sum: { value: 8000 }, _avg: { value: null }, _count: { value: 3 }, _min: { value: null }, _max: { value: null } });

  mockClientCount.mockResolvedValue(5);
  mockDealCount.mockResolvedValue(4);
  // A segunda chamada a client.count e total de clientes
  mockClientCount
    .mockResolvedValueOnce(5) // active clients
    .mockResolvedValueOnce(8); // total clients

  mockDealGroupBy.mockResolvedValue([
    { status: 'new', _count: 1 },
    { status: 'briefing', _count: 1 },
    { status: 'quoting', _count: 1 },
    { status: 'production', _count: 0 },
    { status: 'completed', _count: 1 },
  ]);

  mockExpenseGroupBy.mockResolvedValue([
    { category: 'equipment', _sum: { amount: 1000 } },
    { category: 'travel', _sum: { amount: 500 } },
  ]);
}

function buildClients() {
  return [
    { id: 'cl_1', name: 'Alice Tanaka', phone: '+5511', status: 'active' },
    { id: 'cl_2', name: 'Bob Sato', phone: '+5512', status: 'active' },
  ];
}

function buildDeals() {
  return [
    {
      id: 'deal_1',
      clientId: 'cl_1',
      title: 'Casamento Alice',
      status: 'completed',
      value: 3000,
      currency: 'BRL',
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      updatedAt: new Date('2026-06-01T10:00:00.000Z'),
      client: { id: 'cl_1', name: 'Alice Tanaka', phone: '+5511' },
      briefings: [],
      expenses: [],
      revenue: [],
    },
    {
      id: 'deal_2',
      clientId: 'cl_2',
      title: 'Corporativo Bob',
      status: 'new',
      value: 4000,
      currency: 'BRL',
      createdAt: new Date('2026-06-02T10:00:00.000Z'),
      updatedAt: new Date('2026-06-02T10:00:00.000Z'),
      client: { id: 'cl_2', name: 'Bob Sato', phone: '+5512' },
      briefings: [],
      expenses: [],
      revenue: [],
    },
    {
      id: 'deal_3',
      clientId: 'cl_1',
      title: 'Pre-wedding Alice',
      status: 'briefing',
      value: 2000,
      currency: 'BRL',
      createdAt: new Date('2026-06-03T10:00:00.000Z'),
      updatedAt: new Date('2026-06-03T10:00:00.000Z'),
      client: { id: 'cl_1', name: 'Alice Tanaka', phone: '+5511' },
      briefings: [],
      expenses: [],
      revenue: [],
    },
    {
      id: 'deal_4',
      clientId: 'cl_2',
      title: 'Produto Bob',
      status: 'quoting',
      value: 2000,
      currency: 'BRL',
      createdAt: new Date('2026-06-04T10:00:00.000Z'),
      updatedAt: new Date('2026-06-04T10:00:00.000Z'),
      client: { id: 'cl_2', name: 'Bob Sato', phone: '+5512' },
      briefings: [],
      expenses: [],
      revenue: [],
    },
  ];
}

function buildExpenses() {
  const now = new Date();
  // Garante que ao menos uma despesa caia no mes corrente (monthlyRevenue)
  const inMonth = new Date(now.getFullYear(), now.getMonth(), 15);
  return [
    { id: 'exp_1', dealId: 'deal_1', category: 'equipment', description: 'Lens', amount: 1000, currency: 'BRL', date: inMonth, createdAt: inMonth, updatedAt: inMonth },
    { id: 'exp_2', dealId: 'deal_2', category: 'travel', description: 'Fuel', amount: 500, currency: 'BRL', date: inMonth, createdAt: inMonth, updatedAt: inMonth },
  ];
}

function buildRevenue() {
  const now = new Date();
  // Garante que ao menos uma receita recebida caia no mes corrente (monthlyRevenue)
  const inMonth = new Date(now.getFullYear(), now.getMonth(), 10);
  return [
    { id: 'rev_1', dealId: 'deal_1', description: 'Payment 1', amount: 3000, currency: 'BRL', date: inMonth, status: 'received', createdAt: inMonth, updatedAt: inMonth },
    { id: 'rev_2', dealId: 'deal_2', description: 'Payment 2', amount: 2000, currency: 'BRL', date: inMonth, status: 'received', createdAt: inMonth, updatedAt: inMonth },
  ];
}

function buildBookings() {
  const now = new Date();
  // Dentro da janela de 7 dias (nao cancelado)
  const inWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 12, 0, 0, 0);
  // Fora da janela (no passado)
  const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10, 12, 0, 0, 0);
  // Cancelado dentro da janela (deve ser excluido)
  const cancelledInWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 12, 0, 0, 0);
  return [
    {
      id: 'bk_1',
      clientId: 'cl_1',
      dealId: null,
      eventType: 'wedding',
      eventDate: inWindow,
      duration: 120,
      location: 'Tokyo',
      status: 'confirmed',
      notes: null,
      createdAt: now,
      updatedAt: now,
      client: { id: 'cl_1', name: 'Alice Tanaka', phone: '+5511' },
    },
    {
      id: 'bk_2',
      clientId: 'cl_2',
      dealId: 'deal_2',
      eventType: 'corporate',
      eventDate: past,
      duration: 60,
      location: null,
      status: 'completed',
      notes: null,
      createdAt: now,
      updatedAt: now,
      client: { id: 'cl_2', name: 'Bob Sato', phone: '+5512' },
    },
    {
      id: 'bk_3',
      clientId: 'cl_1',
      dealId: null,
      eventType: 'portrait',
      eventDate: cancelledInWindow,
      duration: 90,
      location: 'Studio',
      status: 'cancelled',
      notes: null,
      createdAt: now,
      updatedAt: now,
      client: { id: 'cl_1', name: 'Alice Tanaka', phone: '+5511' },
    },
  ];
}

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('returns 200 with KPIs object containing all required fields', async () => {
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.kpis).toBeDefined();
    expect(data.kpis).toEqual(
      expect.objectContaining({
        totalRevenue: expect.any(Number),
        totalExpenses: expect.any(Number),
        profit: expect.any(Number),
        pipelineValue: expect.any(Number),
        activeClients: expect.any(Number),
        totalDeals: expect.any(Number),
        totalClients: expect.any(Number),
      })
    );
  });

  it('returns dealsByStatus with all 5 statuses', async () => {
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.dealsByStatus).toBeDefined();
    expect(data.dealsByStatus).toEqual(
      expect.objectContaining({
        new: expect.any(Number),
        briefing: expect.any(Number),
        quoting: expect.any(Number),
        production: expect.any(Number),
        completed: expect.any(Number),
      })
    );
  });

  it('returns monthlyRevenue array with 6 entries', async () => {
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.monthlyRevenue)).toBe(true);
    expect(data.monthlyRevenue).toHaveLength(6);
    // Cada entrada deve ter os campos esperados
    expect(data.monthlyRevenue[0]).toEqual(
      expect.objectContaining({
        month: expect.any(String),
        revenue: expect.any(Number),
        expenses: expect.any(Number),
        profit: expect.any(Number),
      })
    );
  });

  it('returns expensesByCategory array', async () => {
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.expensesByCategory)).toBe(true);
    expect(data.expensesByCategory.length).toBeGreaterThan(0);
    expect(data.expensesByCategory[0]).toEqual(
      expect.objectContaining({
        category: expect.any(String),
        amount: expect.any(Number),
      })
    );
  });

  it('returns upcomingBookings array', async () => {
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.upcomingBookings)).toBe(true);
    // Apenas bookings dentro de 7 dias e nao cancelados
    for (const booking of data.upcomingBookings) {
      expect(booking.status).not.toBe('cancelled');
    }
  });

  it('returns recentDeals array (max 10)', async () => {
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.recentDeals)).toBe(true);
    expect(data.recentDeals.length).toBeLessThanOrEqual(10);
  });

  it('returns topClients array (max 5)', async () => {
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.topClients)).toBe(true);
    expect(data.topClients.length).toBeLessThanOrEqual(5);
    if (data.topClients.length > 0) {
      expect(data.topClients[0]).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          value: expect.any(Number),
          deals: expect.any(Number),
        })
      );
    }
  });

  it('returns pipeline object with stages', async () => {
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pipeline).toBeDefined();
    expect(data.pipeline).toEqual(
      expect.objectContaining({
        new: expect.any(Array),
        briefing: expect.any(Array),
        quoting: expect.any(Array),
        production: expect.any(Array),
        completed: expect.any(Array),
      })
    );
  });

  it('computes profit as totalRevenue - totalExpenses', async () => {
    // totalRevenue = 5000, totalExpenses = 1500 => profit = 3500
    mockRevenueAggregate.mockResolvedValue({ _sum: { amount: 5000 }, _avg: { amount: null }, _count: { amount: 2 }, _min: { amount: null }, _max: { amount: null } });
    mockExpenseAggregate.mockResolvedValue({ _sum: { amount: 1500 }, _avg: { amount: null }, _count: { amount: 2 }, _min: { amount: null }, _max: { amount: null } });

    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.kpis.totalRevenue).toBe(5000);
    expect(data.kpis.totalExpenses).toBe(1500);
    expect(data.kpis.profit).toBe(5000 - 1500);
    expect(data.kpis.profit).toBe(3500);
  });

  it('returns 500 on database error', async () => {
    vi.clearAllMocks();
    // O Promise.all falha assim que a primeira chamada rejeita
    mockDealFindMany.mockRejectedValue(new Error('DB connection lost'));

    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
