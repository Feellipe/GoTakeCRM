/**
 * API Integration Tests — Clients
 *
 * Tests the /api/clients route handlers through the HTTP interface.
 * Mocks Prisma at the system boundary (per TDD guidelines).
 * Tests behavior, not implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/clients/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

// Access the mocked functions
const mockClientFindMany = vi.mocked(db.client.findMany);
const mockClientCount = vi.mocked(db.client.count);
const mockClientCreate = vi.mocked(db.client.create);

describe('GET /api/clients', () => {
  const mockClients = [
    {
      id: 'cl_1',
      phone: '+5511999999999',
      name: 'Alice',
      email: 'alice@example.com',
      eventType: 'wedding',
      status: 'active',
      source: 'whatsapp',
      avatar: null,
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      deals: [],
      bookings: [],
      documents: [],
    },
    {
      id: 'cl_2',
      phone: '+5511888888888',
      name: 'Bob',
      email: null,
      eventType: 'corporate',
      status: 'lead',
      source: 'instagram',
      avatar: null,
      notes: 'VIP client',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      deals: [{ value: 5000 }, { value: 3000 }],
      bookings: [],
      documents: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns flat array when no pagination params', async () => {
    mockClientCount.mockResolvedValue(2);
    mockClientFindMany.mockResolvedValue(mockClients);

    const request = new NextRequest('http://localhost/api/clients');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe('Alice');
  });

  it('returns paginated response when page param provided', async () => {
    mockClientCount.mockResolvedValue(10);
    mockClientFindMany.mockResolvedValue(mockClients);

    const request = new NextRequest('http://localhost/api/clients?page=2&limit=5');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.total).toBe(10);
    expect(data.page).toBe(2);
    expect(data.limit).toBe(5);
    expect(data.totalPages).toBe(2);
  });

  it('returns paginated response when limit param provided', async () => {
    mockClientCount.mockResolvedValue(25);
    mockClientFindMany.mockResolvedValue(mockClients);

    const request = new NextRequest('http://localhost/api/clients?limit=10');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data).toBeDefined();
    expect(data.totalPages).toBe(3);
  });

  it('computes client stats (totalDeals, totalValue, activeDeals)', async () => {
    mockClientCount.mockResolvedValue(2);
    mockClientFindMany.mockResolvedValue(mockClients);

    const request = new NextRequest('http://localhost/api/clients');
    const response = await GET(request);
    const data = await response.json();

    const bob = data.find((c: any) => c.name === 'Bob');
    expect(bob.totalDeals).toBe(2);
    expect(bob.totalValue).toBe(8000);
    expect(bob.activeDeals).toBe(2); // both non-completed
  });

  it('returns 500 on database error', async () => {
    mockClientFindMany.mockRejectedValue(new Error('DB connection lost'));
    // count might not even be reached since Promise.all throws
    mockClientCount.mockRejectedValue(new Error('DB connection lost'));

    const request = new NextRequest('http://localhost/api/clients');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch clients');
  });

  it('filters by search term', async () => {
    mockClientCount.mockResolvedValue(1);
    mockClientFindMany.mockResolvedValue([mockClients[0]]);

    const request = new NextRequest('http://localhost/api/clients?search=alice');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockClientFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.objectContaining({ contains: 'alice' }) }),
          ]),
        }),
      })
    );
  });

  it('filters by status', async () => {
    mockClientCount.mockResolvedValue(1);
    mockClientFindMany.mockResolvedValue([mockClients[0]]);

    const request = new NextRequest('http://localhost/api/clients?status=active');
    await GET(request);

    expect(mockClientFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'active' }),
      })
    );
  });

  it('filters by eventType', async () => {
    mockClientCount.mockResolvedValue(1);
    mockClientFindMany.mockResolvedValue([mockClients[0]]);

    const request = new NextRequest('http://localhost/api/clients?eventType=wedding');
    await GET(request);

    expect(mockClientFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ eventType: 'wedding' }),
      })
    );
  });
});

describe('POST /api/clients', () => {
  const validBody = {
    phone: '+5511999999999',
    name: 'New Client',
    eventType: 'wedding',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Allow origin validation to pass in test env (development)
    process.env.NODE_ENV = 'development';
  });

  it('creates a client and returns 201', async () => {
    const createdClient = {
      id: 'cl_new',
      ...validBody,
      email: null,
      notes: null,
      source: 'whatsapp',
      status: 'active',
      avatar: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    mockClientCreate.mockResolvedValue(createdClient);

    const request = new NextRequest('http://localhost/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe('New Client');
    expect(data.phone).toBe('+5511999999999');
    expect(mockClientCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: '+5511999999999',
          name: 'New Client',
          eventType: 'wedding',
          source: 'whatsapp',
          status: 'active',
        }),
      })
    );
  });

  it('applies defaults for source and status', async () => {
    const createdClient = {
      id: 'cl_new',
      phone: '+5511888888888',
      name: 'Minimal',
      email: null,
      eventType: 'corporate',
      notes: null,
      source: 'whatsapp', // default
      status: 'active',   // default
      avatar: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    mockClientCreate.mockResolvedValue(createdClient);

    const request = new NextRequest('http://localhost/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+5511888888888', name: 'Minimal', eventType: 'corporate' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockClientCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'whatsapp',
          status: 'active',
        }),
      })
    );
  });

  it('returns 422 on missing required fields', async () => {
    const request = new NextRequest('http://localhost/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Missing Phone' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
    expect(data.details.length).toBeGreaterThan(0);
  });

  it('returns 422 on invalid email format', async () => {
    const request = new NextRequest('http://localhost/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, email: 'not-an-email' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(422);
  });

  it('returns 422 on invalid eventType', async () => {
    const request = new NextRequest('http://localhost/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, eventType: 'birthday' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(422);
  });

  it('returns 500 on database error', async () => {
    mockClientCreate.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create client');
  });

  it('saves nullable fields correctly', async () => {
    const createdClient = {
      id: 'cl_new',
      ...validBody,
      email: null,
      notes: null,
      avatar: null,
      source: 'whatsapp',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    mockClientCreate.mockResolvedValue(createdClient);

    const request = new NextRequest('http://localhost/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, email: null, avatar: null }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockClientCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: null, avatar: null }),
      })
    );
  });
});
