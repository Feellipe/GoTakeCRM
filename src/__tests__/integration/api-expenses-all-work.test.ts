/**
 * API Integration Tests — Expenses All Work (Multi-Org Aggregation)
 *
 * Tests the GET /api/expenses route handler through the HTTP interface.
 * When no orgId is provided (All Work context), expenses should be
 * returned across all orgs the user belongs to.
 * When orgId is provided, expenses should be scoped to that org.
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
import { GET } from '@/app/api/expenses/route';
import { db } from '@/lib/db';

const mockGetServerSession = vi.mocked(getServerSession);
const mockExpenseFindMany = vi.mocked(db.expense.findMany);
const mockUserOrgFindMany = vi.mocked(db.userOrganization.findMany);

const makeSession = (userId: string) => ({
  user: { id: userId, name: 'Test User', email: 'test@email.com' },
  expires: '2099-01-01T00:00:00.000Z',
});

function buildOrgExpenses(orgId: string, prefix: string) {
  return [
    {
      id: `exp_${prefix}_1`,
      dealId: `deal_${prefix}_1`,
      category: 'equipment',
      description: 'Camera rental',
      amount: 500,
      currency: 'BRL',
      date: '2026-01-02T00:00:00Z',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      deal: { id: `deal_${prefix}_1`, organizationId: orgId, title: `Package ${prefix}`, client: { name: `Client ${prefix} A` } },
    },
    {
      id: `exp_${prefix}_2`,
      dealId: `deal_${prefix}_2`,
      category: 'travel',
      description: 'Fuel',
      amount: 120,
      currency: 'BRL',
      date: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      deal: { id: `deal_${prefix}_2`, organizationId: orgId, title: `Video ${prefix}`, client: { name: `Client ${prefix} B` } },
    },
  ];
}

describe('GET /api/expenses — All Work (multi-org)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns expenses from all orgs when no orgId is specified', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindMany.mockResolvedValue([
      { id: 'mem_a', userId: 'user_1', organizationId: 'org_a', role: 'owner', createdAt: new Date() },
      { id: 'mem_b', userId: 'user_1', organizationId: 'org_b', role: 'admin', createdAt: new Date() },
    ]);

    const expOrgA = buildOrgExpenses('org_a', 'a');
    const expOrgB = buildOrgExpenses('org_b', 'b');
    const allExpenses = [...expOrgA, ...expOrgB];
    mockExpenseFindMany.mockResolvedValue(allExpenses);

    const request = new NextRequest('http://localhost/api/expenses');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(4);
  });

  it('returns expenses filtered by orgId when specified', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindMany.mockResolvedValue([
      { id: 'mem_a', userId: 'user_1', organizationId: 'org_a', role: 'owner', createdAt: new Date() },
      { id: 'mem_b', userId: 'user_1', organizationId: 'org_b', role: 'admin', createdAt: new Date() },
    ]);

    const expOrgA = buildOrgExpenses('org_a', 'a');
    mockExpenseFindMany.mockResolvedValue(expOrgA);

    const request = new NextRequest('http://localhost/api/expenses?orgId=org_a');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data.every((e: any) => (e.deal as any).organizationId === 'org_a')).toBe(true);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/expenses');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
