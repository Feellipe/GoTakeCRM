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
const mockUserFindUnique = vi.mocked(db.user.findUnique);
const mockUserCreate = vi.mocked(db.user.create);
const mockUserOrgCreate = vi.mocked(db.userOrganization.create);

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

describe('POST /api/admin/organizations/[id]/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { POST } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@user.com' }),
    });
    const response = await POST(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not admin of org', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue(null);

    const { POST } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@user.com' }),
    });
    const response = await POST(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 422 when email is missing', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('admin_1'));
    mockUserOrgFindFirst.mockResolvedValue(adminMembership as any);

    const { POST } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await POST(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Email is required');
  });

  it('invites an existing user by email', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('admin_1'));
    mockUserOrgFindFirst
      .mockResolvedValueOnce(adminMembership as any)  // admin check
      .mockResolvedValueOnce(null);                     // not already member
    mockUserFindUnique.mockResolvedValue({ id: 'existing_u', name: 'Existing', email: 'existing@user.com', avatar: null } as any);

    const createdMembership = {
      id: 'new_mem',
      userId: 'existing_u',
      organizationId: 'org_1',
      role: 'member',
      createdAt: '2026-01-03T00:00:00.000Z',
      user: { id: 'existing_u', name: 'Existing', email: 'existing@user.com', avatar: null },
    };
    mockUserOrgCreate.mockResolvedValue(createdMembership as any);

    const { POST } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'existing@user.com' }),
    });
    const response = await POST(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.email).toBe('existing@user.com');
    expect(data.role).toBe('member');
    expect(mockUserOrgCreate).toHaveBeenCalled();
  });

  it('creates user if not found and invites them', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('admin_1'));
    mockUserOrgFindFirst
      .mockResolvedValueOnce(adminMembership as any)  // admin check
      .mockResolvedValueOnce(null);                     // not already member
    mockUserFindUnique.mockResolvedValue(null);         // user not found
    mockUserCreate.mockResolvedValue({ id: 'new_u', name: 'new', email: 'new@user.com', avatar: null } as any);

    const createdMembership = {
      id: 'new_mem',
      userId: 'new_u',
      organizationId: 'org_1',
      role: 'member',
      createdAt: '2026-01-03T00:00:00.000Z',
      user: { id: 'new_u', name: 'new', email: 'new@user.com', avatar: null },
    };
    mockUserOrgCreate.mockResolvedValue(createdMembership as any);

    const { POST } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@user.com' }),
    });
    const response = await POST(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.email).toBe('new@user.com');
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: { email: 'new@user.com', name: 'new' },
    });
  });

  it('returns 409 when user is already a member', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('admin_1'));
    mockUserOrgFindFirst
      .mockResolvedValueOnce(adminMembership as any)  // admin check
      .mockResolvedValueOnce({ id: 'existing_mem' } as any); // already a member
    mockUserFindUnique.mockResolvedValue({ id: 'u1', name: 'Existing', email: 'admin@org.com', avatar: null } as any);

    const { POST } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@org.com' }),
    });
    const response = await POST(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('User is already a member of this organization');
  });
});

describe('PATCH /api/admin/organizations/[id]/members', () => {
  const mockUserOrgUpdate = vi.mocked(db.userOrganization.update);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { PATCH } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'mem_1', role: 'admin' }),
    });
    const response = await PATCH(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not admin of org', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue(null);

    const { PATCH } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'mem_1', role: 'admin' }),
    });
    const response = await PATCH(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 422 when memberId or role is missing', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('admin_1'));
    mockUserOrgFindFirst.mockResolvedValue(adminMembership as any);

    const { PATCH } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'mem_1' }), // missing role
    });
    const response = await PATCH(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('memberId and role are required');
  });

  it('returns 404 when member not found in this org', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('admin_1'));
    mockUserOrgFindFirst.mockResolvedValueOnce(adminMembership as any)  // admin check
      .mockResolvedValueOnce(null); // member not found

    const { PATCH } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'nonexistent', role: 'admin' }),
    });
    const response = await PATCH(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Member not found in this organization');
  });

  it('updates member role successfully', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('admin_1'));
    mockUserOrgFindFirst
      .mockResolvedValueOnce(adminMembership as any)  // admin check
      .mockResolvedValueOnce({ id: 'mem_2', userId: 'u2', organizationId: 'org_1', role: 'member' } as any); // target member found

    const updatedMembership = {
      id: 'mem_2',
      userId: 'u2',
      organizationId: 'org_1',
      role: 'admin',
      createdAt: '2026-01-02T00:00:00.000Z',
      user: { id: 'u2', name: 'João', email: 'joao@org.com', avatar: null },
    };
    mockUserOrgUpdate.mockResolvedValue(updatedMembership as any);

    const { PATCH } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'mem_2', role: 'admin' }),
    });
    const response = await PATCH(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.role).toBe('admin');
    expect(data.user.email).toBe('joao@org.com');
    expect(mockUserOrgUpdate).toHaveBeenCalledWith({
      where: { id: 'mem_2' },
      data: { role: 'admin' },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  });
});

describe('DELETE /api/admin/organizations/[id]/members', () => {
  const mockUserOrgDelete = vi.mocked(db.userOrganization.delete);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { DELETE } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'mem_2' }),
    });
    const response = await DELETE(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not admin of org', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue(null);

    const { DELETE } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'mem_2' }),
    });
    const response = await DELETE(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 422 when memberId is missing', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('admin_1'));
    mockUserOrgFindFirst.mockResolvedValue(adminMembership as any);

    const { DELETE } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await DELETE(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('memberId is required');
  });

  it('returns 422 when trying to remove self', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('admin_1'));
    mockUserOrgFindFirst.mockResolvedValue(adminMembership as any); // admin check

    const { DELETE } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'mem_admin' }),
    });
    const response = await DELETE(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Cannot remove yourself from the organization');
  });

  it('returns 404 when member not found in this org', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('admin_1'));
    mockUserOrgFindFirst
      .mockResolvedValueOnce(adminMembership as any)  // admin check
      .mockResolvedValueOnce(null);                     // member not found

    const { DELETE } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'nonexistent' }),
    });
    const response = await DELETE(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Member not found in this organization');
  });

  it('removes member successfully', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('admin_1'));
    mockUserOrgFindFirst
      .mockResolvedValueOnce(adminMembership as any)  // admin check
      .mockResolvedValueOnce({ id: 'mem_2', userId: 'u2', organizationId: 'org_1', role: 'member' } as any); // target member found
    mockUserOrgDelete.mockResolvedValue({ id: 'mem_2' } as any);

    const { DELETE } = await import('@/app/api/admin/organizations/[id]/members/route');
    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'mem_2' }),
    });
    const response = await DELETE(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUserOrgDelete).toHaveBeenCalledWith({
      where: { id: 'mem_2' },
    });
  });
});
