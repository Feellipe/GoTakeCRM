/**
 * API Integration Tests — Proposals
 *
 * Tests the /api/proposals and /api/proposals/[id] route handlers through the
 * HTTP interface. Mocks Prisma at the system boundary (per TDD guidelines).
 * Tests behavior, not implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/proposals/route';
import { GET as GET_BY_ID, PUT, DELETE } from '@/app/api/proposals/[id]/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

// Access the mocked functions
const mockProposalFindMany = vi.mocked(db.proposal.findMany);
const mockProposalFindUnique = vi.mocked(db.proposal.findUnique);
const mockProposalCreate = vi.mocked(db.proposal.create);
const mockProposalUpdate = vi.mocked(db.proposal.update);
const mockProposalDelete = vi.mocked(db.proposal.delete);

// Helper para construir o contexto params (Promise<{ id: string }>)
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/proposals', () => {
  const mockProposals = [
    {
      id: 'pr_1',
      organizationId: 'org_1',
      clientId: 'cl_1',
      dealId: 'deal_1',
      templateId: null,
      title: 'Wedding Package Proposal',
      description: null,
      status: 'sent',
      packages: 'Photography + Video',
      customItems: null,
      portfolioLinks: null,
      terms: null,
      validUntil: null,
      totalValue: 5000,
      currency: 'BRL',
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      client: {
        id: 'cl_1',
        name: 'Alice',
        email: 'alice@example.com',
        phone: '+5511',
        avatar: null,
      },
      deal: {
        id: 'deal_1',
        title: 'Wedding Package',
        status: 'quoting',
        value: 5000,
      },
      template: {
        id: 'tpl_1',
        name: 'Premium Template',
      },
    },
    {
      id: 'pr_2',
      organizationId: 'org_1',
      clientId: 'cl_2',
      dealId: 'deal_2',
      templateId: null,
      title: 'Corporate Video Proposal',
      description: null,
      status: 'draft',
      packages: 'Videography',
      customItems: null,
      portfolioLinks: null,
      terms: null,
      validUntil: null,
      totalValue: 3000,
      currency: 'BRL',
      notes: null,
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      client: {
        id: 'cl_2',
        name: 'Bob',
        email: 'bob@example.com',
        phone: '+5512',
        avatar: null,
      },
      deal: {
        id: 'deal_2',
        title: 'Corporate Video',
        status: 'new',
        value: 3000,
      },
      template: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an array of proposals with client, deal, template', async () => {
    mockProposalFindMany.mockResolvedValue(mockProposals);

    const request = new NextRequest('http://localhost/api/proposals');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe('pr_1');
    expect(data[0].client).toBeDefined();
    expect(data[0].client.name).toBe('Alice');
    expect(data[0].deal).toBeDefined();
    expect(data[0].deal.title).toBe('Wedding Package');
    expect(data[0].template).toBeDefined();
    expect(data[0].template.name).toBe('Premium Template');
  });

  it('filters by dealId param', async () => {
    mockProposalFindMany.mockResolvedValue([mockProposals[0]]);

    const request = new NextRequest('http://localhost/api/proposals?dealId=deal_1');
    await GET(request);

    expect(mockProposalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ dealId: 'deal_1' }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockProposalFindMany.mockRejectedValue(new Error('DB connection lost'));

    const request = new NextRequest('http://localhost/api/proposals');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch proposals');
  });
});

describe('POST /api/proposals', () => {
  const validBody = {
    organizationId: 'org_1',
    clientId: 'cl_1',
    title: 'Wedding Package Proposal',
    packages: 'Photography + Video',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Permite que a validacao de origem passe no ambiente de teste (development)
    process.env.NODE_ENV = 'development';
  });

  it('creates a proposal and returns 201', async () => {
    const createdProposal = {
      id: 'pr_new',
      organizationId: 'org_1',
      clientId: 'cl_1',
      dealId: null,
      templateId: null,
      title: 'Wedding Package Proposal',
      description: null,
      status: 'draft',
      packages: 'Photography + Video',
      customItems: null,
      portfolioLinks: null,
      terms: null,
      validUntil: null,
      totalValue: 0,
      currency: 'BRL',
      notes: null,
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
      client: { id: 'cl_1', name: 'Alice' },
      deal: null,
    };
    mockProposalCreate.mockResolvedValue(createdProposal);

    const request = new NextRequest('http://localhost/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('pr_new');
    expect(data.client).toBeDefined();
    expect(mockProposalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'cl_1',
          title: 'Wedding Package Proposal',
          packages: 'Photography + Video',
        }),
      })
    );
  });

  it('applies defaults (status: draft, currency: BRL, totalValue: 0)', async () => {
    const createdProposal = {
      id: 'pr_new',
      organizationId: 'org_1',
      clientId: 'cl_1',
      dealId: null,
      templateId: null,
      title: 'Wedding Package Proposal',
      description: null,
      status: 'draft',
      packages: 'Photography + Video',
      customItems: null,
      portfolioLinks: null,
      terms: null,
      validUntil: null,
      totalValue: 0,
      currency: 'BRL',
      notes: null,
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
      client: { id: 'cl_1', name: 'Alice' },
      deal: null,
    };
    mockProposalCreate.mockResolvedValue(createdProposal);

    const request = new NextRequest('http://localhost/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockProposalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'draft',
          currency: 'BRL',
          totalValue: 0,
        }),
      })
    );
  });

  it('returns 422 on missing required fields (clientId, title, packages)', async () => {
    const request = new NextRequest('http://localhost/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Missing fields' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
    expect(data.details.length).toBeGreaterThan(0);
  });

  it('returns 500 on database error', async () => {
    mockProposalCreate.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create proposal');
  });
});

describe('GET /api/proposals/[id]', () => {
  const mockProposal = {
    id: 'pr_1',
    organizationId: 'org_1',
    clientId: 'cl_1',
    dealId: 'deal_1',
    templateId: 'tpl_1',
    title: 'Wedding Package Proposal',
    description: null,
    status: 'sent',
    packages: 'Photography + Video',
    customItems: null,
    portfolioLinks: null,
    terms: null,
    validUntil: null,
    totalValue: 5000,
    currency: 'BRL',
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    client: {
      id: 'cl_1',
      name: 'Alice',
      email: 'alice@example.com',
      phone: '+5511',
      avatar: null,
    },
    deal: {
      id: 'deal_1',
      title: 'Wedding Package',
      status: 'quoting',
      value: 5000,
    },
    template: {
      id: 'tpl_1',
      name: 'Premium Template',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a single proposal with relations', async () => {
    mockProposalFindUnique.mockResolvedValue(mockProposal);

    const request = new NextRequest('http://localhost/api/proposals/pr_1');
    const response = await GET_BY_ID(request, makeParams('pr_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('pr_1');
    expect(data.client.name).toBe('Alice');
    expect(data.deal.title).toBe('Wedding Package');
    expect(data.template.name).toBe('Premium Template');
    expect(mockProposalFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pr_1' } })
    );
  });

  it('returns 404 if not found', async () => {
    mockProposalFindUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/proposals/missing');
    const response = await GET_BY_ID(request, makeParams('missing'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Proposal not found');
  });
});

describe('PUT /api/proposals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Permite que a validacao de origem passe no ambiente de teste (development)
    process.env.NODE_ENV = 'development';
  });

  it('updates a proposal and returns updated data', async () => {
    const updatedProposal = {
      id: 'pr_1',
      organizationId: 'org_1',
      clientId: 'cl_1',
      dealId: 'deal_1',
      templateId: null,
      title: 'Updated Title',
      description: null,
      status: 'draft',
      packages: 'Photography',
      customItems: null,
      portfolioLinks: null,
      terms: null,
      validUntil: new Date('2026-12-31'),
      totalValue: 4500,
      currency: 'BRL',
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
      client: { id: 'cl_1', name: 'Alice' },
      deal: { id: 'deal_1', title: 'Wedding Package' },
    };
    mockProposalUpdate.mockResolvedValue(updatedProposal);

    const request = new NextRequest('http://localhost/api/proposals/pr_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title', validUntil: '2026-12-31' }),
    });
    const response = await PUT(request, makeParams('pr_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('Updated Title');
    expect(mockProposalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pr_1' },
        data: expect.objectContaining({
          title: 'Updated Title',
          validUntil: new Date('2026-12-31'),
        }),
      })
    );
  });

  it('sets sentAt when status changes to "sent"', async () => {
    mockProposalUpdate.mockResolvedValue({ id: 'pr_1', status: 'sent' });

    const request = new NextRequest('http://localhost/api/proposals/pr_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' }),
    });
    const response = await PUT(request, makeParams('pr_1'));

    expect(response.status).toBe(200);
    expect(mockProposalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'sent',
          sentAt: expect.any(Date),
        }),
      })
    );
  });

  it('sets viewedAt when status changes to "viewed"', async () => {
    mockProposalUpdate.mockResolvedValue({ id: 'pr_1', status: 'viewed' });

    const request = new NextRequest('http://localhost/api/proposals/pr_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'viewed' }),
    });
    const response = await PUT(request, makeParams('pr_1'));

    expect(response.status).toBe(200);
    expect(mockProposalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'viewed',
          viewedAt: expect.any(Date),
        }),
      })
    );
  });

  it('sets respondedAt when status changes to "accepted"', async () => {
    mockProposalUpdate.mockResolvedValue({ id: 'pr_1', status: 'accepted' });

    const request = new NextRequest('http://localhost/api/proposals/pr_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'accepted' }),
    });
    const response = await PUT(request, makeParams('pr_1'));

    expect(response.status).toBe(200);
    expect(mockProposalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'accepted',
          respondedAt: expect.any(Date),
        }),
      })
    );
  });

  it('returns 422 on invalid data', async () => {
    const request = new NextRequest('http://localhost/api/proposals/pr_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalValue: -100 }),
    });
    const response = await PUT(request, makeParams('pr_1'));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
  });
});

describe('DELETE /api/proposals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Permite que a validacao de origem passe no ambiente de teste (development)
    process.env.NODE_ENV = 'development';
  });

  it('deletes a proposal and returns success', async () => {
    mockProposalDelete.mockResolvedValue({ id: 'pr_1' } as never);

    const request = new NextRequest('http://localhost/api/proposals/pr_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('pr_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockProposalDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pr_1' } })
    );
  });

  it('returns 500 on database error', async () => {
    mockProposalDelete.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/proposals/pr_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('pr_1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete proposal');
  });
});
