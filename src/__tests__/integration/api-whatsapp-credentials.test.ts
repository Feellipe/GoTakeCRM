/**
 * API Integration Tests — PATCH /api/admin/organizations/[id]/whatsapp
 *
 * Tests the WhatsApp credentials update route handler through the HTTP interface.
 * Mocks Prisma and NextAuth at the system boundary (per TDD guidelines).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '@/app/api/admin/organizations/[id]/whatsapp/route';
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

describe('PATCH /api/admin/organizations/[id]/whatsapp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/whatsapp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappPhoneId: 'phone_id_123' }),
    });
    const response = await PATCH(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not owner of org', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/whatsapp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappPhoneId: 'phone_id_123' }),
    });
    const response = await PATCH(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden: not an owner of this organization');
    expect(mockUserOrgFindFirst).toHaveBeenCalledWith({
      where: { userId: 'user_1', organizationId: 'org_1', role: 'owner' },
    });
  });

  it('updates whatsapp credentials successfully', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({ id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'owner', createdAt: '2026-01-01T00:00:00Z' } as any);

    const updatedOrg = {
      id: 'org_1',
      name: 'Test Org',
      slug: 'test-org',
      whatsappPhoneId: 'phone_id_123',
      whatsappToken: 'token_abc_123',
      whatsappPhone: '+5511999999999',
      plan: 'solo',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    mockOrgUpdate.mockResolvedValue(updatedOrg as any);

    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/whatsapp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        whatsappPhoneId: 'phone_id_123',
        whatsappToken: 'token_abc_123',
        whatsappPhone: '+5511999999999',
      }),
    });
    const response = await PATCH(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('org_1');
    expect(data.whatsappPhoneId).toBe('phone_id_123');
    // Token should NOT be in response for security
    expect(data).not.toHaveProperty('whatsappToken');
    expect(mockOrgUpdate).toHaveBeenCalledWith({
      where: { id: 'org_1' },
      data: {
        whatsappPhoneId: 'phone_id_123',
        whatsappToken: 'token_abc_123',
        whatsappPhone: '+5511999999999',
      },
    });
  });

  it('accepts partial update (only phoneId, no token)', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({ id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'owner', createdAt: '2026-01-01T00:00:00Z' } as any);

    const updatedOrg = {
      id: 'org_1',
      name: 'Test Org',
      slug: 'test-org',
      whatsappPhoneId: 'phone_id_456',
      whatsappToken: null,
      whatsappPhone: null,
      plan: 'solo',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    mockOrgUpdate.mockResolvedValue(updatedOrg as any);

    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/whatsapp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappPhoneId: 'phone_id_456' }),
    });
    const response = await PATCH(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.whatsappPhoneId).toBe('phone_id_456');
    expect(data).not.toHaveProperty('whatsappToken');
    expect(mockOrgUpdate).toHaveBeenCalledWith({
      where: { id: 'org_1' },
      data: {
        whatsappPhoneId: 'phone_id_456',
      },
    });
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({ id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'owner', createdAt: '2026-01-01T00:00:00Z' } as any);
    mockOrgUpdate.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/admin/organizations/org_1/whatsapp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappPhoneId: 'test' }),
    });
    const response = await PATCH(request, makeParams('org_1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update WhatsApp credentials');
  });
});
