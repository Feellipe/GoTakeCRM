/**
 * API Integration Tests — Revenues
 *
 * Tests the /api/revenues and /api/revenues/[id] route handlers through the
 * HTTP interface. Mocks Prisma at the system boundary (per TDD guidelines).
 * Tests behavior, not implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/revenues/route';
import { GET as GET_BY_ID, PUT, DELETE } from '@/app/api/revenues/[id]/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

// Access the mocked functions
const mockRevenueFindMany = vi.mocked(db.revenue.findMany);
const mockRevenueFindUnique = vi.mocked(db.revenue.findUnique);
const mockRevenueCreate = vi.mocked(db.revenue.create);
const mockRevenueUpdate = vi.mocked(db.revenue.update);
const mockRevenueDelete = vi.mocked(db.revenue.delete);

describe('GET /api/revenues', () => {
  const mockRevenues = [
    {
      id: 'rev_1',
      dealId: 'deal_1',
      description: 'First installment',
      amount: 4000,
      currency: 'BRL',
      date: '2026-01-10T00:00:00Z',
      status: 'received',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      deal: {
        id: 'deal_1',
        title: 'Wedding Package',
        client: { id: 'cl_1', name: 'Alice', email: 'alice@example.com', phone: '+5511', avatar: null },
      },
    },
    {
      id: 'rev_2',
      dealId: 'deal_2',
      description: null,
      amount: 2500,
      currency: 'BRL',
      date: '2026-01-05T00:00:00Z',
      status: 'pending',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      deal: {
        id: 'deal_2',
        title: 'Corporate Video',
        client: { id: 'cl_2', name: 'Bob', email: null, phone: '+5512', avatar: null },
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an array of revenues with deal and client info', async () => {
    mockRevenueFindMany.mockResolvedValue(mockRevenues);

    const request = new NextRequest('http://localhost/api/revenues');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].deal).toBeDefined();
    expect(data[0].deal.client).toBeDefined();
    expect(data[0].deal.client.name).toBe('Alice');
  });

  it('filters by dealId search param', async () => {
    mockRevenueFindMany.mockResolvedValue([mockRevenues[0]]);

    const request = new NextRequest('http://localhost/api/revenues?dealId=deal_1');
    await GET(request);

    expect(mockRevenueFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ dealId: 'deal_1' }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockRevenueFindMany.mockRejectedValue(new Error('DB connection lost'));

    const request = new NextRequest('http://localhost/api/revenues');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch revenues');
  });
});

describe('POST /api/revenues', () => {
  const validBody = {
    dealId: 'deal_1',
    description: 'Deposit',
    amount: 2000,
    date: '2026-02-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Allow origin validation to pass in test env (development)
    process.env.NODE_ENV = 'development';
  });

  it('creates a revenue and returns 201', async () => {
    const createdRevenue = {
      id: 'rev_new',
      dealId: 'deal_1',
      description: 'Deposit',
      amount: 2000,
      currency: 'BRL',
      date: new Date('2026-02-01'),
      status: 'received',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
      deal: {
        id: 'deal_1',
        title: 'Wedding Package',
        client: { id: 'cl_1', name: 'Alice' },
      },
    };
    mockRevenueCreate.mockResolvedValue(createdRevenue);

    const request = new NextRequest('http://localhost/api/revenues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.dealId).toBe('deal_1');
    expect(data.deal).toBeDefined();
    expect(mockRevenueCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealId: 'deal_1',
          amount: 2000,
          date: new Date('2026-02-01'),
        }),
      })
    );
  });

  it('applies defaults for currency and status', async () => {
    const createdRevenue = {
      id: 'rev_new',
      dealId: 'deal_1',
      description: null,
      amount: 1500,
      currency: 'BRL',
      date: new Date(),
      status: 'received',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
      deal: {
        id: 'deal_1',
        title: 'Wedding Package',
        client: { id: 'cl_1', name: 'Alice' },
      },
    };
    mockRevenueCreate.mockResolvedValue(createdRevenue);

    const request = new NextRequest('http://localhost/api/revenues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: 'deal_1', amount: 1500 }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockRevenueCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currency: 'BRL',
          status: 'received',
        }),
      })
    );
  });

  it('returns 422 on zero amount', async () => {
    const request = new NextRequest('http://localhost/api/revenues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: 'deal_1', amount: 0 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 500 on database error', async () => {
    mockRevenueCreate.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/revenues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create revenue');
  });
});

describe('GET /api/revenues/[id]', () => {
  const mockRevenue = {
    id: 'rev_1',
    dealId: 'deal_1',
    description: 'First installment',
    amount: 4000,
    currency: 'BRL',
    date: '2026-01-10T00:00:00Z',
    status: 'received',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deal: {
      id: 'deal_1',
      title: 'Wedding Package',
      client: { id: 'cl_1', name: 'Alice', email: 'alice@example.com', phone: '+5511', avatar: null },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a single revenue', async () => {
    mockRevenueFindUnique.mockResolvedValue(mockRevenue);

    const request = new NextRequest('http://localhost/api/revenues/rev_1');
    const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'rev_1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('rev_1');
    expect(data.deal.client.name).toBe('Alice');
    expect(mockRevenueFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rev_1' } })
    );
  });

  it('returns 404 when revenue is not found', async () => {
    mockRevenueFindUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/revenues/missing');
    const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'missing' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Revenue not found');
  });
});

describe('PUT /api/revenues/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Allow origin validation to pass in test env (development)
    process.env.NODE_ENV = 'development';
  });

  it('updates a revenue and returns updated data', async () => {
    const updatedRevenue = {
      id: 'rev_1',
      dealId: 'deal_1',
      description: 'Updated installment',
      amount: 5000,
      currency: 'BRL',
      date: new Date('2026-03-01'),
      status: 'received',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
      deal: {
        id: 'deal_1',
        title: 'Wedding Package',
        client: { id: 'cl_1', name: 'Alice' },
      },
    };
    mockRevenueUpdate.mockResolvedValue(updatedRevenue);

    const request = new NextRequest('http://localhost/api/revenues/rev_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 5000, date: '2026-03-01' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: 'rev_1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.amount).toBe(5000);
    expect(mockRevenueUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rev_1' },
        data: expect.objectContaining({
          amount: 5000,
          date: new Date('2026-03-01'),
        }),
      })
    );
  });

  it('returns 422 on invalid data', async () => {
    const request = new NextRequest('http://localhost/api/revenues/rev_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: -100 }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: 'rev_1' }) });
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
  });
});

describe('DELETE /api/revenues/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Allow origin validation to pass in test env (development)
    process.env.NODE_ENV = 'development';
  });

  it('deletes a revenue and returns success', async () => {
    mockRevenueDelete.mockResolvedValue({ id: 'rev_1' } as never);

    const request = new NextRequest('http://localhost/api/revenues/rev_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'rev_1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRevenueDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rev_1' } })
    );
  });

  it('returns 500 on database error', async () => {
    mockRevenueDelete.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/revenues/rev_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'rev_1' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete revenue');
  });
});
