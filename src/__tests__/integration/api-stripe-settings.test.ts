/**
 * API Integration Tests — PATCH /api/admin/organizations/[id]/stripe
 *
 * Tests the Stripe credentials update route handler through the HTTP interface.
 * Mocks Prisma and NextAuth at the system boundary (per TDD guidelines).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '@/app/api/admin/organizations/[id]/stripe/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

// Mock getServerSession
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from 'next-auth';

const mockGetServerSession = vi.mocked(getServerSession);
const mockUserOrgFindFirst = vi.mocked(db.userOrganization.findFirst);
const mockOrgUpdate = vi.mocked(db.organization.update);

// Helper for dynamic route params
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const makeSession = (userId: string) => ({
  user: { id: userId, name: 'Test', email: 'test@email.com' },
  expires: '2099-01-01T00:00:00.000Z',
});

describe('PATCH /api/admin/organizations/[id]/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves Stripe keys and masks secret in response', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({
      id: 'mem_1',
      userId: 'user_1',
      organizationId: 'org_1',
      role: 'owner',
      createdAt: '2026-01-01T00:00:00Z',
    } as any);

    const updatedOrg = {
      id: 'org_1',
      name: 'Test Org',
      slug: 'test-org',
      stripePublicKey: 'pk_test_abc',
      stripeSecretKey: 'sk_tes..._xyz',
      stripeWebhookSecret: null,
      plan: 'solo',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    mockOrgUpdate.mockResolvedValue(updatedOrg as any);

    const request = new NextRequest(
      'http://localhost/api/admin/organizations/org_1/stripe',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripePublicKey: 'pk_test_abc',
          stripeSecretKey: 'sk_tes..._xyz',
        }),
      }
    );
    const response = await PATCH(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stripePublicKey).toBe('pk_test_abc');
    // Secret key should be masked in response
    expect(data.stripeSecretKey).toContain('••••');
    expect(data.stripeSecretKey).not.toContain('secret');
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost/api/admin/organizations/org_1/stripe',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripePublicKey: 'pk_test_abc' }),
      }
    );
    const response = await PATCH(request, makeParams('org_1'));

    expect(response.status).toBe(401);
    expect(await response.json()).toHaveProperty('error');
  });

  it('returns 403 when user has viewer role', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    // findFirst with role: ['owner', 'admin'] returns null for viewer
    mockUserOrgFindFirst.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost/api/admin/organizations/org_1/stripe',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripePublicKey: 'pk_test_abc' }),
      }
    );
    const response = await PATCH(request, makeParams('org_1'));

    expect(response.status).toBe(403);
    expect(await response.json()).toHaveProperty('error');
  });
});
