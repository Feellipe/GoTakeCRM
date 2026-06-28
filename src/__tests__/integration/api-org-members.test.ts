/**
 * API Integration Tests — /api/admin/organizations/[id]/members
 *
 * Tests the members CRUD route handlers through the HTTP interface.
 * Mocks Prisma and NextAuth at the system boundary (per TDD guidelines).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock getServerSession
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';

const mockGetServerSession = vi.mocked(getServerSession);
const mockUserOrgFindFirst = vi.mocked(db.userOrganization.findFirst);
const mockUserOrgFindMany = vi.mocked(db.userOrganization.findMany);

// Helper for dynamic route params
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const makeSession = (userId: string) => ({
  user: { id: userId, name: 'Test', email: 'test@email.com' },
  expires: '2099-01-01T00:00:00.000Z',
});

const adminMembership = {
  id: 'mem_admin',
  userId: 'admin_1',
  organizationId: 'org_1',
  role: 'admin',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const members = [
  {
    id: 'mem_1',
    userId: 'u1',
    organizationId: 'org_1',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z',
    user: { id: 'u1', name: 'Admin', email: 'admin@org.com', avatar: null },
  },
  {
    id: 'mem_2',
    userId: 'u2',
    organizationId: 'org_1',
    role: 'member',
    createdAt: '2026-01-02T00:00:00.000Z',
    user: { id: 'u2', name: 'João', email: 'joao@org.com', avatar: null },
  },
];

describe('GET /api/admin/organizations/[id]/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { GET } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members');
    const response = await GET(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not admin of org', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue(null);

    const { GET } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members');
    const response = await GET(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns members list for an org when user is admin', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('admin_1'));
    mockUserOrgFindFirst.mockResolvedValue(adminMembership as any);
    mockUserOrgFindMany.mockResolvedValue(members as any);

    const { GET } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members');
    const response = await GET(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0]).toHaveProperty('user');
    expect(data[0]).toHaveProperty('role');
    expect(data[0].user.email).toBe('admin@org.com');
    expect(data[1].user.email).toBe('joao@org.com');
  });
});
