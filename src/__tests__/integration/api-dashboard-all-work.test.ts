/**
 * API Integration Tests — Dashboard All Work (Multi-Org Aggregation)
 *
 * Tests the GET /api/dashboard route with orgId query parameter.
 * When no orgId is provided (All Work context), data should be
 * aggregated across all orgs the user belongs to.
 * When an orgId is provided, data should be scoped to that org.
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
import { GET } from '@/app/api/dashboard/route';
import { db } from '@/lib/db';

const mockGetServerSession = vi.mocked(getServerSession);

// Access mocked db functions
const mockDealFindMany = vi.mocked(db.deal.findMany);
const mockClientFindMany = vi.mocked(db.client.findMany);
const mockBookingFindMany = vi.mocked(db.booking.findMany);
const mockExpenseFindMany = vi.mocked(db.expense.findMany);
const mockRevenueFindMany = vi.mocked(db.revenue.findMany);
const mockRevenueAggregate = vi.mocked(db.revenue.aggregate);
const mockExpenseAggregate = vi.mocked(db.expense.aggregate);
const mockDealAggregate = vi.mocked(db.deal.aggregate);
const mockClientCount = vi.mocked(db.client.count);
const mockDealCount = vi.mocked(db.deal.count);
const mockDealGroupBy = vi.mocked(db.deal.groupBy);
const mockExpenseGroupBy = vi.mocked(db.expense.groupBy);
const mockUserOrgFindMany = vi.mocked(db.userOrganization.findMany);

const makeSession = (userId: string) => ({
  user: { id: userId, name: 'Test User', email: 'test@email.com' },
  expires: '2099-01-01T00:00:00.000Z',
});

/**
 * Builds deals for a specific org — 2 deals per org by default.
 */
function buildOrgDeals(orgId: string, prefix: string) {
  const now = new Date();
  return [
    {
      id: `deal_${prefix}_1`,
      organizationId: orgId,
      clientId: `cl_${prefix}_1`,
      title: `Deal ${prefix} 1`,
      status: 'completed',
      value: 3000,
      currency: 'BRL',
      createdAt: new Date(now.getFullYear(), now.getMonth(), 1),
      updatedAt: new Date(now.getFullYear(), now.getMonth(), 1),
      client: { id: `cl_${prefix}_1`, name: `Client ${prefix} A`, phone: '+5511' },
      briefings: [],
      expenses: [],
      revenue: [],
    },
    {
      id: `deal_${prefix}_2`,
      organizationId: orgId,
      clientId: `cl_${prefix}_2`,
      title: `Deal ${prefix} 2`,
      status: 'new',
      value: 2000,
      currency: 'BRL',
      createdAt: new Date(now.getFullYear(), now.getMonth(), 2),
      updatedAt: new Date(now.getFullYear(), now.getMonth(), 2),
      client: { id: `cl_${prefix}_2`, name: `Client ${prefix} B`, phone: '+5512' },
      briefings: [],
      expenses: [],
      revenue: [],
    },
  ];
}

function buildOrgClients(orgId: string, prefix: string) {
  const now = new Date();
  return [
    { id: `cl_${prefix}_1`, organizationId: orgId, name: `Client ${prefix} A`, phone: '+5511', status: 'active', email: null, eventType: 'wedding', notes: null, source: 'whatsapp', avatar: null, createdAt: now, updatedAt: now },
    { id: `cl_${prefix}_2`, organizationId: orgId, name: `Client ${prefix} B`, phone: '+5512', status: 'active', email: null, eventType: 'corporate', notes: null, source: 'instagram', avatar: null, createdAt: now, updatedAt: now },
  ];
}

function buildOrgExpenses(orgId: string, prefix: string) {
  const now = new Date();
  const inMonth = new Date(now.getFullYear(), now.getMonth(), 15);
  return [
    { id: `exp_${prefix}_1`, dealId: `deal_${prefix}_1`, category: 'equipment', description: 'Lens', amount: 1000, currency: 'BRL', date: inMonth, createdAt: inMonth, updatedAt: inMonth },
    { id: `exp_${prefix}_2`, dealId: `deal_${prefix}_2`, category: 'travel', description: 'Fuel', amount: 500, currency: 'BRL', date: inMonth, createdAt: inMonth, updatedAt: inMonth },
  ];
}

function buildOrgRevenue(orgId: string, prefix: string) {
  const now = new Date();
  const inMonth = new Date(now.getFullYear(), now.getMonth(), 10);
  return [
    { id: `rev_${prefix}_1`, dealId: `deal_${prefix}_1`, description: 'Payment 1', amount: 3000, currency: 'BRL', date: inMonth, status: 'received', createdAt: inMonth, updatedAt: inMonth },
    { id: `rev_${prefix}_2`, dealId: `deal_${prefix}_2`, description: 'Payment 2', amount: 2000, currency: 'BRL', date: inMonth, status: 'received', createdAt: inMonth, updatedAt: inMonth },
  ];
}

function buildOrgBookings(orgId: string, prefix: string) {
  const now = new Date();
  const inWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 12, 0, 0, 0);
  return [
    {
      id: `bk_${prefix}_1`,
      organizationId: orgId,
      clientId: `cl_${prefix}_1`,
      dealId: null,
      eventType: 'wedding',
      eventDate: inWindow,
      duration: 120,
      location: 'Studio',
      status: 'confirmed',
      notes: null,
      createdAt: now,
      updatedAt: now,
      client: { id: `cl_${prefix}_1`, name: `Client ${prefix} A`, phone: '+5511' },
    },
  ];
}

/**
 * Sets up mocks for a scenario with 2 orgs.
 * Each org has its own deals, clients, expenses, revenue, bookings.
 * Aggregates are set up so we can verify cross-org summation.
 */
function setupMultiOrgMocks(orgIdFilter?: string) {
  const org1 = 'org_a';
  const org2 = 'org_b';

  const allDeals = [...buildOrgDeals(org1, 'a'), ...buildOrgDeals(org2, 'b')];
  const allClients = [...buildOrgClients(org1, 'a'), ...buildOrgClients(org2, 'b')];
  const allExpenses = [...buildOrgExpenses(org1, 'a'), ...buildOrgExpenses(org2, 'b')];
  const allRevenue = [...buildOrgRevenue(org1, 'a'), ...buildOrgRevenue(org2, 'b')];
  const allBookings = [...buildOrgBookings(org1, 'a'), ...buildOrgBookings(org2, 'b')];

  // If orgIdFilter is set, only return data for that org
  const filteredDeals = orgIdFilter
    ? allDeals.filter(d => d.organizationId === orgIdFilter)
    : allDeals;
  const filteredClients = orgIdFilter
    ? allClients.filter(c => c.organizationId === orgIdFilter)
    : allClients;
  const filteredExpenses = orgIdFilter
    ? allExpenses.filter(e => {
        const deal = allDeals.find(d => d.id === e.dealId);
        return deal && deal.organizationId === orgIdFilter;
      })
    : allExpenses;
  const filteredRevenue = orgIdFilter
    ? allRevenue.filter(r => {
        const deal = allDeals.find(d => d.id === r.dealId);
        return deal && deal.organizationId === orgIdFilter;
      })
    : allRevenue;
  const filteredBookings = orgIdFilter
    ? allBookings.filter(b => b.organizationId === orgIdFilter)
    : allBookings;

  mockDealFindMany.mockResolvedValue(filteredDeals);
  mockClientFindMany.mockResolvedValue(filteredClients);
  mockExpenseFindMany.mockResolvedValue(filteredExpenses);
  mockRevenueFindMany.mockResolvedValue(filteredRevenue);
  mockBookingFindMany.mockResolvedValue(filteredBookings);

  // Revenues: 2 per org, each 3000+2000 = 5000 per org
  const filteredRevenueAmount = filteredRevenue
    .filter(r => r.status === 'received')
    .reduce((s, r) => s + r.amount, 0);
  // Expenses: 2 per org, each 1000+500 = 1500 per org
  const filteredExpenseAmount = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  // Pipeline: deals not completed => per org: one deal (the 'new' one) = 2000
  const filteredPipelineAmount = filteredDeals
    .filter(d => d.status !== 'completed')
    .reduce((s, d) => s + d.value, 0);

  mockRevenueAggregate.mockResolvedValue({
    _sum: { amount: filteredRevenueAmount },
    _avg: { amount: null }, _count: { amount: filteredRevenue.length }, _min: { amount: null }, _max: { amount: null },
  });
  mockExpenseAggregate.mockResolvedValue({
    _sum: { amount: filteredExpenseAmount },
    _avg: { amount: null }, _count: { amount: filteredExpenses.length }, _min: { amount: null }, _max: { amount: null },
  });
  mockDealAggregate.mockResolvedValue({
    _sum: { value: filteredPipelineAmount },
    _avg: { value: null }, _count: { value: filteredDeals.filter(d => d.status !== 'completed').length }, _min: { value: null }, _max: { value: null },
  });

  const activeCount = filteredClients.filter(c => c.status === 'active').length;
  const totalCount = filteredClients.length;
  mockClientCount
    .mockResolvedValueOnce(activeCount)
    .mockResolvedValueOnce(totalCount);

  mockDealCount.mockResolvedValue(filteredDeals.length);

  // Build groupBy from filtered deals and expenses
  const statusCounts: Record<string, number> = {};
  for (const d of filteredDeals) {
    statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
  }
  mockDealGroupBy.mockResolvedValue(
    Object.entries(statusCounts).map(([status, _count]) => ({ status, _count }))
  );

  const categorySums: Record<string, number> = {};
  for (const e of filteredExpenses) {
    categorySums[e.category] = (categorySums[e.category] || 0) + e.amount;
  }
  mockExpenseGroupBy.mockResolvedValue(
    Object.entries(categorySums).map(([category, amount]) => ({
      category,
      _sum: { amount },
    }))
  );

  return { org1, org2 };
}

describe('GET /api/dashboard — All Work (multi-org)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns aggregated data across all orgs when no orgId is specified', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindMany.mockResolvedValue([
      { id: 'mem_a', userId: 'user_1', organizationId: 'org_a', role: 'owner', createdAt: new Date() },
      { id: 'mem_b', userId: 'user_1', organizationId: 'org_b', role: 'admin', createdAt: new Date() },
    ]);

    setupMultiOrgMocks(); // no filter = all orgs

    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // 2 orgs × 5000 = 10000 revenue
    expect(data.kpis.totalRevenue).toBe(10000);
    // 2 orgs × 1500 = 3000 expenses
    expect(data.kpis.totalExpenses).toBe(3000);
    // profit = 10000 - 3000
    expect(data.kpis.profit).toBe(7000);
    // pipeline: 2 deals not completed (one 'new' per org, each 2000) = 4000
    expect(data.kpis.pipelineValue).toBe(4000);
    // active clients: 2 per org = 4
    expect(data.kpis.activeClients).toBe(4);
    // total deals: 2 per org = 4
    expect(data.kpis.totalDeals).toBe(4);
    // total clients: 2 per org = 4
    expect(data.kpis.totalClients).toBe(4);
  });

  it('returns filtered data when orgId is specified', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindMany.mockResolvedValue([
      { id: 'mem_a', userId: 'user_1', organizationId: 'org_a', role: 'owner', createdAt: new Date() },
      { id: 'mem_b', userId: 'user_1', organizationId: 'org_b', role: 'admin', createdAt: new Date() },
    ]);

    setupMultiOrgMocks('org_a');

    const request = new NextRequest('http://localhost/api/dashboard?orgId=org_a');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Only org_a: 5000 revenue
    expect(data.kpis.totalRevenue).toBe(5000);
    // Only org_a: 1500 expenses
    expect(data.kpis.totalExpenses).toBe(1500);
    // profit = 5000 - 1500
    expect(data.kpis.profit).toBe(3500);
    // pipeline: 1 deal not completed (2000)
    expect(data.kpis.pipelineValue).toBe(2000);
    // active clients: 2
    expect(data.kpis.activeClients).toBe(2);
    // total deals: 2
    expect(data.kpis.totalDeals).toBe(2);
    // total clients: 2
    expect(data.kpis.totalClients).toBe(2);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
