/**
 * API Integration Tests — Revenues All Work (Multi-Org Aggregation)
 *
 * Tests the GET /api/revenues route handler through the HTTP interface.
 * When no orgId is provided (All Work context), revenues should be
 * returned across all orgs the user belongs to.
 * When orgId is provided, revenues should be scoped to that org.
 *
 * Mocks Prisma at the system boundary (per TDD guidelines).
 * Mocks next-auth getServerSession for user authentication.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next-auth for session
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/revenues/route';
import { db } from '@/lib/db';

const mockGetServerSession = vi.mocked(getServerSession);
const mockRevenueFindMany = vi.mocked(db.revenue.findMany);
const mockUserOrgFindMany = vi.mocked(db.userOrganization.findMany);

const makeSession = (userId: string) => ({
  user: { id: userId, name: 'Test User', email: 'test@email.com' },
  expires: '2099-01-01T00:00:00.000Z',
});

function buildOrgRevenues(orgId: string, prefix: string) {
  return [
    {
      id: `rev_${prefix}_1`,
      dealId: `deal_${prefix}_1`,
      description: 'First installment',
      amount: 4000,
      currency: 'BRL',
      date: '2026-01-10T00:00:00Z',
      status: 'received',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      deal: {
        id: `deal_${prefix}_1`,
        organizationId: orgId,
        title: `Package ${prefix}`,
        client: { id: `cl_${prefix}_1`, name: `Client ${prefix} A`, email: 'client@example.com', phone: '+5511', avatar: null },
      },
    },
    {
      id: `rev_${prefix}_2`,
      dealId: `deal_${prefix}_2`,
      description: null,
      amount: 2500,
      currency: 'BRL',
      date: '2026-01-05T00:00:00Z',
      status: 'pending',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      deal: {
        id: `deal_${prefix}_2`,
        organizationId: orgId,
        title: `Video ${prefix}`,
        client: { id: `cl_${prefix}_2`, name: `Client ${prefix} B`, email: null, phone: '+5512', avatar: null },
      },
    },
  ];
}

describe('GET /api/revenues — All Work (multi-org)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns revenues from all orgs when no orgId is specified', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindMany.mockResolvedValue([
      { id: 'mem_a', userId: 'user_1', organizationId: 'org_a', role: 'owner', createdAt: new Date() },
      { id: 'mem_b', userId: 'user_1', organizationId: 'org_b', role: 'admin', createdAt: new Date() },
    ]);

    const revOrgA = buildOrgRevenues('org_a', 'a');
    const revOrgB = buildOrgRevenues('org_b', 'b');
    const allRevenues = [...revOrgA, ...revOrgB];
    mockRevenueFindMany.mockResolvedValue(allRevenues);

    const request = new NextRequest('http://localhost/api/revenues');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(4);
  });

  it('returns revenues filtered by orgId when specified', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindMany.mockResolvedValue([
      { id: 'mem_a', userId: 'user_1', organizationId: 'org_a', role: 'owner', createdAt: new Date() },
      { id: 'mem_b', userId: 'user_1', organizationId: 'org_b', role: 'admin', createdAt: new Date() },
    ]);

    const revOrgA = buildOrgRevenues('org_a', 'a');
    mockRevenueFindMany.mockResolvedValue(revOrgA);

    const request = new NextRequest('http://localhost/api/revenues?orgId=org_a');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    // All returned data should have org_a via their deal relation
    expect(data.every((r: any) => (r.deal as any).organizationId === 'org_a')).toBe(true);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/revenues');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
