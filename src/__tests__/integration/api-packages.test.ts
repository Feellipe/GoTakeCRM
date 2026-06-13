/**
 * API Integration Tests — Packages
 *
 * Tests the /api/packages and /api/packages/[id] route handlers through the HTTP interface.
 * Mocks Prisma at the system boundary.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/packages/route';
import {
  GET as GETById,
  PUT,
  DELETE,
} from '@/app/api/packages/[id]/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

const mockPackageFindMany = vi.mocked(db.package.findMany);
const mockPackageFindUnique = vi.mocked(db.package.findUnique);
const mockPackageCreate = vi.mocked(db.package.create);
const mockPackageUpdate = vi.mocked(db.package.update);
const mockPackageDelete = vi.mocked(db.package.delete);

// Helper para construir o objeto params exigido pelos handlers [id]
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/packages', () => {
  const mockPackages = [
    {
      id: 'pkg_1',
      name: 'Wedding Premium',
      description: 'Full wedding coverage',
      price: 8000,
      deliverables: '600 photos + album',
      duration: 480,
      category: 'photography',
      active: true,
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 'pkg_2',
      name: 'Corporate Video',
      description: 'Corporate promotional video',
      price: 5000,
      deliverables: '3 min video + raw footage',
      duration: 240,
      category: 'videography',
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only active packages', async () => {
    mockPackageFindMany.mockResolvedValue(mockPackages);

    const request = new NextRequest('http://localhost/api/packages');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(mockPackageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockPackageFindMany.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/packages');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch packages');
  });
});

describe('POST /api/packages', () => {
  const validBody = {
    name: 'Wedding Premium',
    description: 'Full wedding coverage',
    price: 8000,
    deliverables: '600 photos + album',
    duration: 480,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  it('creates a package and returns 201', async () => {
    const createdPackage = {
      id: 'pkg_new',
      name: 'Wedding Premium',
      description: 'Full wedding coverage',
      price: 8000,
      deliverables: '600 photos + album',
      duration: 480,
      category: 'photography',
      active: true,
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    };
    mockPackageCreate.mockResolvedValue(createdPackage);

    const request = new NextRequest('http://localhost/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('pkg_new');
    expect(mockPackageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Wedding Premium',
          price: 8000,
        }),
      })
    );
  });

  it('applies category default (photography) and active default (true)', async () => {
    const createdPackage = {
      id: 'pkg_new',
      name: 'Wedding Premium',
      description: 'Full wedding coverage',
      price: 8000,
      deliverables: '600 photos + album',
      duration: 480,
      category: 'photography',
      active: true,
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    };
    mockPackageCreate.mockResolvedValue(createdPackage);

    const request = new NextRequest('http://localhost/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockPackageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: 'photography',
          active: true,
        }),
      })
    );
  });

  it('returns 422 on missing required fields', async () => {
    const request = new NextRequest('http://localhost/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'photography' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
    expect(mockPackageCreate).not.toHaveBeenCalled();
  });

  it('returns 422 on zero price', async () => {
    const request = new NextRequest('http://localhost/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, price: 0 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
    expect(mockPackageCreate).not.toHaveBeenCalled();
  });

  it('returns 500 on database error', async () => {
    mockPackageCreate.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});

describe('GET /api/packages/[id]', () => {
  const mockPackage = {
    id: 'pkg_1',
    name: 'Wedding Premium',
    description: 'Full wedding coverage',
    price: 8000,
    deliverables: '600 photos + album',
    duration: 480,
    category: 'photography',
    active: true,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a single package', async () => {
    mockPackageFindUnique.mockResolvedValue(mockPackage);

    const request = new NextRequest('http://localhost/api/packages/pkg_1');
    const response = await GETById(request, makeParams('pkg_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('pkg_1');
    expect(data.name).toBe('Wedding Premium');
    expect(mockPackageFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pkg_1' },
      })
    );
  });

  it('returns 404 if not found', async () => {
    mockPackageFindUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/packages/missing');
    const response = await GETById(request, makeParams('missing'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Package not found');
  });
});

describe('PUT /api/packages/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  it('updates a package and returns updated data', async () => {
    const updatedPackage = {
      id: 'pkg_1',
      name: 'Wedding Premium Plus',
      description: 'Full wedding coverage',
      price: 9500,
      deliverables: '600 photos + album',
      duration: 480,
      category: 'photography',
      active: true,
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    };
    mockPackageUpdate.mockResolvedValue(updatedPackage);

    const request = new NextRequest('http://localhost/api/packages/pkg_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Wedding Premium Plus',
        price: 9500,
      }),
    });
    const response = await PUT(request, makeParams('pkg_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Wedding Premium Plus');
    expect(data.price).toBe(9500);
    expect(mockPackageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pkg_1' },
        data: expect.objectContaining({
          name: 'Wedding Premium Plus',
          price: 9500,
        }),
      })
    );
  });

  it('returns 422 on negative price', async () => {
    const request = new NextRequest('http://localhost/api/packages/pkg_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: -100 }),
    });
    const response = await PUT(request, makeParams('pkg_1'));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
    expect(mockPackageUpdate).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/packages/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  it('deletes a package and returns success: true', async () => {
    mockPackageDelete.mockResolvedValue({ id: 'pkg_1' } as never);

    const request = new NextRequest('http://localhost/api/packages/pkg_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('pkg_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPackageDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pkg_1' },
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockPackageDelete.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/packages/pkg_1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, makeParams('pkg_1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete package');
  });
});
