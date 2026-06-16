/**
 * API Integration Tests — Client [id]
 *
 * Tests the /api/clients/[id] route handlers (GET, PUT, DELETE) through the HTTP interface.
 * Mocks Prisma at the system boundary (per TDD guidelines).
 * Tests behavior, not implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/clients/[id]/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

// Access the mocked functions
const mockClientFindUnique = vi.mocked(db.client.findUnique);
const mockClientUpdate = vi.mocked(db.client.update);
const mockDealFindMany = vi.mocked(db.deal.findMany);
const mockTransaction = vi.mocked(db.$transaction);

// Helper para construir o objeto params exigido pelos handlers [id]
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/clients/[id]', () => {
  const mockClient = {
    id: 'cl_1',
    organizationId: 'org_1',
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
    deals: [
      {
        id: 'deal_1',
        organizationId: 'org_1',
        title: 'Wedding Package',
        status: 'new',
        value: 8000,
        currency: 'BRL',
        briefings: [],
        expenses: [],
        revenue: [],
      },
    ],
    bookings: [
      {
        id: 'bk_1',
        organizationId: 'org_1',
        eventType: 'wedding',
        eventDate: '2026-02-01T12:00:00Z',
        status: 'confirmed',
      },
    ],
    documents: [
      {
        id: 'doc_1',
        organizationId: 'org_1',
        type: 'contract',
        title: 'Service Contract',
        filename: 'contract.pdf',
        storageUrl: 's3://bucket/contract.pdf',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns client with deals, bookings, documents', async () => {
    mockClientFindUnique.mockResolvedValue(mockClient);

    const request = new NextRequest('http://localhost/api/clients/cl_1');
    const response = await GET(request, makeParams('cl_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('cl_1');
    expect(data.name).toBe('Alice');
    expect(data.deals).toBeDefined();
    expect(data.deals).toHaveLength(1);
    expect(data.deals[0].title).toBe('Wedding Package');
    expect(data.bookings).toBeDefined();
    expect(data.bookings).toHaveLength(1);
    expect(data.documents).toBeDefined();
    expect(data.documents).toHaveLength(1);
    expect(mockClientFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cl_1' },
        include: expect.objectContaining({
          deals: expect.objectContaining({
            include: expect.objectContaining({
              briefings: true,
              expenses: true,
              revenue: true,
            }),
          }),
          bookings: true,
          documents: true,
        }),
      })
    );
  });

  it('returns 404 when client not found', async () => {
    mockClientFindUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/clients/missing');
    const response = await GET(request, makeParams('missing'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Client not found');
  });

  it('returns 500 on DB error', async () => {
    mockClientFindUnique.mockRejectedValue(new Error('DB connection lost'));

    const request = new NextRequest('http://localhost/api/clients/cl_1');
    const response = await GET(request, makeParams('cl_1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch client');
  });
});

describe('PUT /api/clients/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Permite que a validacao de origem passe no ambiente de teste (development)
    process.env.NODE_ENV = 'development';
  });

  it('updates client with validated fields only', async () => {
    const updatedClient = {
      id: 'cl_1',
      organizationId: 'org_1',
      phone: '+5511999999999',
      name: 'Alice Updated',
      email: 'alice.updated@example.com',
      eventType: 'wedding',
      status: 'active',
      source: 'whatsapp',
      avatar: null,
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    };
    mockClientUpdate.mockResolvedValue(updatedClient);

    // Inclui um campo malicioso que nao pertence ao schema (protecao mass assignment)
    const request = new NextRequest('http://localhost/api/clients/cl_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Updated',
        email: 'alice.updated@example.com',
        isAdmin: true, // deve ser removido pela validacao
      }),
    });
    const response = await PUT(request, makeParams('cl_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Alice Updated');
    expect(mockClientUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cl_1' },
        data: expect.objectContaining({
          name: 'Alice Updated',
          email: 'alice.updated@example.com',
        }),
      })
    );
    // Apenas campos validados sao repassados ao Prisma (mass assignment protection)
    const callArgs = mockClientUpdate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(callArgs.data).not.toHaveProperty('isAdmin');
  });

  it('returns 422 on invalid update data', async () => {
    const request = new NextRequest('http://localhost/api/clients/cl_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    const response = await PUT(request, makeParams('cl_1'));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
    expect(mockClientUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 on DB error', async () => {
    mockClientUpdate.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/clients/cl_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice Updated' }),
    });
    const response = await PUT(request, makeParams('cl_1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update client');
  });
});

describe('DELETE /api/clients/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Permite que a validacao de origem passe no ambiente de teste (development)
    process.env.NODE_ENV = 'development';
  });

  it('cascades deletion (calls $transaction with array)', async () => {
    // Deals relacionados encontrados antes da transacao
    mockDealFindMany.mockResolvedValue([
      { id: 'deal_1' },
      { id: 'deal_2' },
    ] as never);
    mockTransaction.mockResolvedValue([] as never);

    const request = new NextRequest('http://localhost/api/clients/cl_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('cl_1'));

    expect(response.status).toBe(200);
    // Busca os deals relacionados antes de montar a cascata
    expect(mockDealFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'cl_1' } })
    );
    // A exclusao em cascata ocorre dentro de uma unica transacao em array
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    const txArg = mockTransaction.mock.calls[0][0];
    expect(Array.isArray(txArg)).toBe(true);
    // 7 operacoes em cascata: documents, bookings, briefings, expenses, revenues, deals, client
    expect(txArg).toHaveLength(7);
  });

  it('returns { success: true }', async () => {
    mockDealFindMany.mockResolvedValue([{ id: 'deal_1' }] as never);
    mockTransaction.mockResolvedValue([] as never);

    const request = new NextRequest('http://localhost/api/clients/cl_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('cl_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 500 on DB error', async () => {
    mockDealFindMany.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/clients/cl_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('cl_1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete client');
  });
});
