/**
 * API Integration Tests — Expenses
 *
 * Tests the /api/expenses and /api/expenses/[id] route handlers through the HTTP interface.
 * Mocks Prisma at the system boundary.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/expenses/route';
import {
  GET as GETById,
  PUT,
  DELETE,
} from '@/app/api/expenses/[id]/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

const mockExpenseFindMany = vi.mocked(db.expense.findMany);
const mockExpenseFindUnique = vi.mocked(db.expense.findUnique);
const mockExpenseCreate = vi.mocked(db.expense.create);
const mockExpenseUpdate = vi.mocked(db.expense.update);
const mockExpenseDelete = vi.mocked(db.expense.delete);

// Helper para construir o objeto params exigido pelos handlers [id]
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/expenses', () => {
  const mockExpenses = [
    {
      id: 'exp_1',
      dealId: 'deal_1',
      category: 'equipment',
      description: 'Camera rental',
      amount: 500,
      currency: 'BRL',
      date: '2026-01-02T00:00:00Z',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      deal: { id: 'deal_1', title: 'Wedding Package', client: { name: 'Alice' } },
    },
    {
      id: 'exp_2',
      dealId: 'deal_2',
      category: 'travel',
      description: 'Fuel',
      amount: 120,
      currency: 'BRL',
      date: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      deal: { id: 'deal_2', title: 'Corporate Video', client: { name: 'Bob' } },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of expenses with deal info', async () => {
    mockExpenseFindMany.mockResolvedValue(mockExpenses);

    const request = new NextRequest('http://localhost/api/expenses');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].deal).toBeDefined();
    expect(data[0].deal.client).toEqual({ name: 'Alice' });
    expect(mockExpenseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          deal: expect.objectContaining({
            select: expect.objectContaining({
              id: true,
              title: true,
            }),
          }),
        }),
        orderBy: { date: 'desc' },
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockExpenseFindMany.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/expenses');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch expenses');
  });
});

describe('POST /api/expenses', () => {
  const validBody = {
    dealId: 'deal_1',
    category: 'equipment',
    description: 'Camera rental',
    amount: 500,
    date: '2026-01-02',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  it('creates an expense and returns 201', async () => {
    const createdExpense = {
      id: 'exp_new',
      dealId: 'deal_1',
      category: 'equipment',
      description: 'Camera rental',
      amount: 500,
      currency: 'BRL',
      date: new Date('2026-01-02'),
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      deal: { id: 'deal_1', title: 'Wedding Package', client: { name: 'Alice' } },
    };
    mockExpenseCreate.mockResolvedValue(createdExpense);

    const request = new NextRequest('http://localhost/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('exp_new');
    expect(data.deal).toBeDefined();
    expect(mockExpenseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealId: 'deal_1',
          category: 'equipment',
          amount: 500,
        }),
      })
    );
  });

  it('applies currency default (BRL) when not provided', async () => {
    const createdExpense = {
      id: 'exp_new',
      dealId: 'deal_1',
      category: 'equipment',
      description: 'Camera rental',
      amount: 500,
      currency: 'BRL',
      date: new Date(),
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      deal: { id: 'deal_1', title: 'Wedding Package', client: { name: 'Alice' } },
    };
    mockExpenseCreate.mockResolvedValue(createdExpense);

    const request = new NextRequest('http://localhost/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockExpenseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currency: 'BRL',
        }),
      })
    );
  });

  it('returns 422 on zero amount', async () => {
    const request = new NextRequest('http://localhost/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, amount: 0 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
    expect(mockExpenseCreate).not.toHaveBeenCalled();
  });

  it('returns 422 on missing dealId', async () => {
    const request = new NextRequest('http://localhost/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'equipment',
        description: 'Camera rental',
        amount: 500,
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
    expect(mockExpenseCreate).not.toHaveBeenCalled();
  });

  it('returns 500 on database error', async () => {
    mockExpenseCreate.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});

describe('GET /api/expenses/[id]', () => {
  const mockExpense = {
    id: 'exp_1',
    dealId: 'deal_1',
    category: 'equipment',
    description: 'Camera rental',
    amount: 500,
    currency: 'BRL',
    date: '2026-01-02T00:00:00Z',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    deal: {
      id: 'deal_1',
      title: 'Wedding Package',
      clientId: 'cl_1',
      status: 'new',
      value: 8000,
      currency: 'BRL',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a single expense with deal', async () => {
    mockExpenseFindUnique.mockResolvedValue(mockExpense);

    const request = new NextRequest('http://localhost/api/expenses/exp_1');
    const response = await GETById(request, makeParams('exp_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('exp_1');
    expect(data.deal).toBeDefined();
    expect(data.deal.title).toBe('Wedding Package');
    expect(mockExpenseFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'exp_1' },
        include: { deal: true },
      })
    );
  });

  it('returns 404 if not found', async () => {
    mockExpenseFindUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/expenses/missing');
    const response = await GETById(request, makeParams('missing'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Expense not found');
  });

  it('returns 500 on database error', async () => {
    mockExpenseFindUnique.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/expenses/exp_1');
    const response = await GETById(request, makeParams('exp_1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch expense');
  });
});

describe('PUT /api/expenses/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  it('updates an expense and returns updated data', async () => {
    const updatedExpense = {
      id: 'exp_1',
      dealId: 'deal_1',
      category: 'crew',
      description: 'Assistant fee',
      amount: 800,
      currency: 'BRL',
      date: new Date('2026-02-01'),
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
      deal: { id: 'deal_1', title: 'Wedding Package', client: { name: 'Alice' } },
    };
    mockExpenseUpdate.mockResolvedValue(updatedExpense);

    const request = new NextRequest('http://localhost/api/expenses/exp_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'crew',
        description: 'Assistant fee',
        amount: 800,
        date: '2026-02-01',
      }),
    });
    const response = await PUT(request, makeParams('exp_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.category).toBe('crew');
    expect(data.amount).toBe(800);
    expect(mockExpenseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'exp_1' },
        data: expect.objectContaining({
          category: 'crew',
          date: expect.any(Date),
        }),
      })
    );
  });

  it('returns 422 on invalid update data', async () => {
    const request = new NextRequest('http://localhost/api/expenses/exp_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: -50 }),
    });
    const response = await PUT(request, makeParams('exp_1'));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
    expect(mockExpenseUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 on database error', async () => {
    mockExpenseUpdate.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/expenses/exp_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Updated' }),
    });
    const response = await PUT(request, makeParams('exp_1'));

    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/expenses/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  it('deletes an expense and returns success: true', async () => {
    mockExpenseDelete.mockResolvedValue({ id: 'exp_1' } as never);

    const request = new NextRequest('http://localhost/api/expenses/exp_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('exp_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockExpenseDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'exp_1' },
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockExpenseDelete.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/expenses/exp_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('exp_1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete expense');
  });
});
