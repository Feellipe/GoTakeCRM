/**
 * API Integration Tests — Deals
 *
 * Tests the /api/deals route handlers through the HTTP interface.
 * Mocks Prisma at the system boundary.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PATCH } from '@/app/api/deals/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

const mockDealFindMany = vi.mocked(db.deal.findMany);
const mockDealCount = vi.mocked(db.deal.count);
const mockDealCreate = vi.mocked(db.deal.create);
const mockDealUpdate = vi.mocked(db.deal.update);

describe('GET /api/deals', () => {
  const mockDeals = [
    {
      id: 'deal_1',
      organizationId: 'org_1',
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
      revenue: [{ amount: 3000, status: 'received' }, { amount: 2000, status: 'pending' }],
      bookings: [],
      documents: [],
    },
    {
      id: 'deal_2',
      organizationId: 'org_1',
      clientId: 'cl_2',
      title: 'Corporate Video',
      description: null,
      status: 'completed',
      value: 5000,
      currency: 'BRL',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      client: { id: 'cl_2', name: 'Bob', phone: '+5512' },
      briefings: [],
      expenses: [{ amount: 1000 }],
      revenue: [{ amount: 5000, status: 'received' }],
      bookings: [],
      documents: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns flat array when no pagination params', async () => {
    mockDealCount.mockResolvedValue(2);
    mockDealFindMany.mockResolvedValue(mockDeals);

    const request = new NextRequest('http://localhost/api/deals');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
  });

  it('returns paginated response when page param provided', async () => {
    mockDealCount.mockResolvedValue(20);
    mockDealFindMany.mockResolvedValue(mockDeals);

    const request = new NextRequest('http://localhost/api/deals?page=3&limit=5');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.total).toBe(20);
    expect(data.page).toBe(3);
    expect(data.limit).toBe(5);
    expect(data.totalPages).toBe(4);
  });

  it('computes totalExpenses from deal expenses', async () => {
    mockDealCount.mockResolvedValue(2);
    mockDealFindMany.mockResolvedValue(mockDeals);

    const request = new NextRequest('http://localhost/api/deals');
    const response = await GET(request);
    const data = await response.json();

    const wedding = data.find((d: any) => d.title === 'Wedding Package');
    expect(wedding.totalExpenses).toBe(700); // 500 + 200
  });

  it('computes totalRevenue only from received revenues', async () => {
    mockDealCount.mockResolvedValue(2);
    mockDealFindMany.mockResolvedValue(mockDeals);

    const request = new NextRequest('http://localhost/api/deals');
    const response = await GET(request);
    const data = await response.json();

    const wedding = data.find((d: any) => d.title === 'Wedding Package');
    expect(wedding.totalRevenue).toBe(3000); // only received, not pending
  });

  it('computes profit as received revenue minus expenses', async () => {
    mockDealCount.mockResolvedValue(2);
    mockDealFindMany.mockResolvedValue(mockDeals);

    const request = new NextRequest('http://localhost/api/deals');
    const response = await GET(request);
    const data = await response.json();

    const wedding = data.find((d: any) => d.title === 'Wedding Package');
    expect(wedding.profit).toBe(2300); // 3000 - 700

    const corporate = data.find((d: any) => d.title === 'Corporate Video');
    expect(corporate.profit).toBe(4000); // 5000 - 1000
  });

  it('filters by status', async () => {
    mockDealCount.mockResolvedValue(1);
    mockDealFindMany.mockResolvedValue([mockDeals[0]]);

    const request = new NextRequest('http://localhost/api/deals?status=new');
    await GET(request);

    expect(mockDealFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'new' }),
      })
    );
  });

  it('filters by clientId', async () => {
    mockDealCount.mockResolvedValue(1);
    mockDealFindMany.mockResolvedValue([mockDeals[0]]);

    const request = new NextRequest('http://localhost/api/deals?clientId=cl_1');
    await GET(request);

    expect(mockDealFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'cl_1' }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockDealFindMany.mockRejectedValue(new Error('DB error'));
    mockDealCount.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/deals');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch deals');
  });
});

describe('POST /api/deals', () => {
  const validBody = {
    organizationId: 'org_1',
    clientId: 'cl_1',
    title: 'New Deal',
    description: 'A test deal',
    status: 'new',
    value: 5000,
    currency: 'BRL',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  it('creates a deal and returns 201', async () => {
    const createdDeal = {
      id: 'deal_new',
      organizationId: 'org_1',
      ...validBody,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      client: { id: 'cl_1', name: 'Alice' },
    };
    mockDealCreate.mockResolvedValue(createdDeal);

    const request = new NextRequest('http://localhost/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.title).toBe('New Deal');
    expect(data.client).toBeDefined();
    expect(mockDealCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'cl_1',
          title: 'New Deal',
        }),
      })
    );
  });

  it('applies defaults for status, value, and currency', async () => {
    const createdDeal = {
      id: 'deal_new',
      organizationId: 'org_1',
      clientId: 'cl_1',
      title: 'Minimal Deal',
      description: null,
      status: 'new',
      value: 0,
      currency: 'BRL',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      client: { id: 'cl_1', name: 'Alice' },
    };
    mockDealCreate.mockResolvedValue(createdDeal);

    const request = new NextRequest('http://localhost/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: 'org_1', clientId: 'cl_1', title: 'Minimal Deal' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockDealCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'new',
          value: 0,
          currency: 'BRL',
        }),
      })
    );
  });

  it('returns 422 on missing clientId', async () => {
    const request = new NextRequest('http://localhost/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'No Client' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 422 on negative value', async () => {
    const request = new NextRequest('http://localhost/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: 'cl_1', title: 'Bad', value: -100 }),
    });
    const response = await POST(request);

    expect(response.status).toBe(422);
  });

  it('returns 500 on database error', async () => {
    mockDealCreate.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});

describe('PATCH /api/deals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  it('updates a deal and returns updated data', async () => {
    const updatedDeal = {
      id: 'deal_1',
      organizationId: 'org_1',
      clientId: 'cl_1',
      title: 'Updated Title',
      description: 'Updated',
      status: 'quoting',
      value: 10000,
      currency: 'BRL',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      client: { id: 'cl_1', name: 'Alice' },
    };
    mockDealUpdate.mockResolvedValue(updatedDeal);

    const request = new NextRequest('http://localhost/api/deals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'deal_1', title: 'Updated Title', status: 'quoting', value: 10000 }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('Updated Title');
    expect(mockDealUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'deal_1' },
      })
    );
  });

  it('returns 400 when id is missing', async () => {
    const request = new NextRequest('http://localhost/api/deals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'No ID' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Deal ID is required');
  });

  it('strips unknown fields via Zod whitelist', async () => {
    const updatedDeal = {
      id: 'deal_1',
      organizationId: 'org_1',
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
    mockDealUpdate.mockResolvedValue(updatedDeal);

    const request = new NextRequest('http://localhost/api/deals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'deal_1', title: 'Updated', clientId: 'should_be_stripped' }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(200);
    // The validated data should NOT include clientId (it's not in updateSchema)
    expect(mockDealUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ clientId: 'should_be_stripped' }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockDealUpdate.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/deals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'deal_1', title: 'Update' }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(500);
  });
});
