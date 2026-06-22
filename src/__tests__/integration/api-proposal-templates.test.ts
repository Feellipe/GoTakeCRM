/**
 * API Integration Tests — Proposal Templates
 *
 * Tests the /api/proposal-templates route handlers through the HTTP interface.
 * Mocks Prisma at the system boundary.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/proposal-templates/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

const mockTemplateFindMany = vi.mocked(db.proposalTemplate.findMany);
const mockTemplateCreate = vi.mocked(db.proposalTemplate.create);

describe('GET /api/proposal-templates', () => {
  const mockTemplates = [
    {
      id: 'tpl_1',
      organizationId: 'org_1',
      name: 'Wedding Package',
      description: 'Standard wedding template',
      defaultTerms: 'Terms here',
      defaultPackages: 'Packages here',
      coverImage: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      _count: { proposals: 3 },
    },
    {
      id: 'tpl_2',
      organizationId: 'org_1',
      name: 'Corporate Video',
      description: null,
      defaultTerms: null,
      defaultPackages: null,
      coverImage: null,
      isActive: true,
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      _count: { proposals: 0 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only active templates with proposal count', async () => {
    mockTemplateFindMany.mockResolvedValue(mockTemplates);

    const request = new NextRequest('http://localhost/api/proposal-templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0]._count).toEqual({ proposals: 3 });
    expect(mockTemplateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: {
          _count: {
            select: { proposals: true },
          },
        },
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockTemplateFindMany.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/proposal-templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch templates');
  });
});

describe('POST /api/proposal-templates', () => {
  const validBody = {
    organizationId: 'org_1',
    name: 'Wedding Package',
    description: 'Standard wedding template',
    defaultTerms: 'Terms here',
    defaultPackages: 'Packages here',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  it('creates a template and returns 201', async () => {
    const createdTemplate = {
      id: 'tpl_new',
      organizationId: 'org_1',
      name: 'Wedding Package',
      description: 'Standard wedding template',
      defaultTerms: 'Terms here',
      defaultPackages: 'Packages here',
      coverImage: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    mockTemplateCreate.mockResolvedValue(createdTemplate);

    const request = new NextRequest('http://localhost/api/proposal-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('tpl_new');
    expect(mockTemplateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Wedding Package',
          description: 'Standard wedding template',
          defaultTerms: 'Terms here',
          defaultPackages: 'Packages here',
        }),
      })
    );
  });

  it('applies isActive default (true) when not provided', async () => {
    const createdTemplate = {
      id: 'tpl_new',
      organizationId: 'org_1',
      name: 'Wedding Package',
      description: null,
      defaultTerms: null,
      defaultPackages: null,
      coverImage: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    mockTemplateCreate.mockResolvedValue(createdTemplate);

    const request = new NextRequest('http://localhost/api/proposal-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Wedding Package' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockTemplateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: true,
        }),
      })
    );
  });

  it('saves nullable fields correctly', async () => {
    const createdTemplate = {
      id: 'tpl_new',
      organizationId: 'org_1',
      name: 'Minimal Template',
      description: null,
      defaultTerms: null,
      defaultPackages: null,
      coverImage: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    mockTemplateCreate.mockResolvedValue(createdTemplate);

    const request = new NextRequest('http://localhost/api/proposal-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Minimal Template',
        description: null,
        defaultTerms: null,
        defaultPackages: null,
        coverImage: null,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockTemplateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: null,
          defaultTerms: null,
          defaultPackages: null,
          coverImage: null,
        }),
      })
    );
  });

  it('returns 422 on empty name', async () => {
    const request = new NextRequest('http://localhost/api/proposal-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
    expect(mockTemplateCreate).not.toHaveBeenCalled();
  });

  it('returns 500 on database error', async () => {
    mockTemplateCreate.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/proposal-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
