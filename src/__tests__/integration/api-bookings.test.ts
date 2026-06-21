/**
 * API Integration Tests — Bookings
 *
 * Tests the /api/bookings route handlers through the HTTP interface.
 * Mocks Prisma at the system boundary (per TDD guidelines).
 * Tests behavior, not implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/bookings/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

// Access the mocked functions
const mockBookingFindMany = vi.mocked(db.booking.findMany);
const mockBookingCreate = vi.mocked(db.booking.create);

describe('GET /api/bookings', () => {
  const mockBookings = [
    {
      id: 'bk_1',
      organizationId: 'org_1',
      clientId: 'cl_1',
      dealId: null,
      eventType: 'wedding',
      eventDate: '2026-02-01T12:00:00.000Z',
      duration: 120,
      location: 'Tokyo',
      status: 'confirmed',
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      client: { id: 'cl_1', name: 'Alice', phone: '+5511' },
      deal: null,
    },
    {
      id: 'bk_2',
      organizationId: 'org_1',
      clientId: 'cl_2',
      dealId: 'deal_1',
      eventType: 'corporate',
      eventDate: '2026-03-01T09:00:00.000Z',
      duration: 60,
      location: null,
      status: 'pending',
      notes: 'Bring extra lens',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      client: { id: 'cl_2', name: 'Bob', phone: '+5512' },
      deal: { id: 'deal_1', title: 'Corporate Video' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an array of bookings', async () => {
    mockBookingFindMany.mockResolvedValue(mockBookings);

    const request = new NextRequest('http://localhost/api/bookings');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe('bk_1');
    expect(data[0].client).toBeDefined();
    expect(data[0].deal).toBeDefined();
  });

  it('filters by status param', async () => {
    mockBookingFindMany.mockResolvedValue([mockBookings[0]]);

    const request = new NextRequest('http://localhost/api/bookings?status=confirmed');
    await GET(request);

    expect(mockBookingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'confirmed' }),
      })
    );
  });

  it('filters by upcoming=true (eventDate >= now)', async () => {
    mockBookingFindMany.mockResolvedValue([mockBookings[0]]);

    const request = new NextRequest('http://localhost/api/bookings?upcoming=true');
    await GET(request);

    expect(mockBookingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventDate: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockBookingFindMany.mockRejectedValue(new Error('DB connection lost'));

    const request = new NextRequest('http://localhost/api/bookings');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch bookings');
  });
});

describe('POST /api/bookings', () => {
  const validBody = {
    organizationId: 'org_1',
    clientId: 'cl_1',
    eventType: 'wedding',
    eventDate: '2026-05-10T12:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Allow origin validation to pass in test env (development)
    process.env.NODE_ENV = 'development';
  });

  it('creates a booking and returns 201', async () => {
    const createdBooking = {
      id: 'bk_new',
      organizationId: 'org_1',
      clientId: 'cl_1',
      dealId: null,
      eventType: 'wedding',
      eventDate: new Date('2026-05-10T12:00:00.000Z'),
      duration: 60,
      location: null,
      status: 'pending',
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      client: { id: 'cl_1', name: 'Alice', phone: '+5511' },
    };
    mockBookingCreate.mockResolvedValue(createdBooking);

    const request = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('bk_new');
    expect(data.client).toBeDefined();
    expect(mockBookingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'cl_1',
          eventType: 'wedding',
        }),
      })
    );
  });

  it('applies defaults (status: pending, duration: 60)', async () => {
    const createdBooking = {
      id: 'bk_new',
      organizationId: 'org_1',
      clientId: 'cl_1',
      dealId: null,
      eventType: 'wedding',
      eventDate: new Date('2026-05-10T12:00:00.000Z'),
      duration: 60,
      location: null,
      status: 'pending',
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      client: { id: 'cl_1', name: 'Alice', phone: '+5511' },
    };
    mockBookingCreate.mockResolvedValue(createdBooking);

    const request = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockBookingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'pending',
          duration: 60,
        }),
      })
    );
  });

  it('returns 422 on missing required fields', async () => {
    const request = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: 'cl_1' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
    expect(data.details.length).toBeGreaterThan(0);
  });

  it('returns 500 on database error', async () => {
    mockBookingCreate.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create booking');
  });
});
