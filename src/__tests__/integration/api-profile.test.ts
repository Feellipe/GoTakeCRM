/**
 * API Integration Tests — PATCH /api/profile
 *
 * Tests the profile update route handler through the HTTP interface.
 * Mocks Prisma and NextAuth at the system boundary (per TDD guidelines).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '@/app/api/profile/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

// Mock getServerSession
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from 'next-auth';

const mockGetServerSession = vi.mocked(getServerSession);
const mockUserUpdate = vi.mocked(db.user.update);

const makeSession = (userId: string) => ({
  user: { id: userId, name: 'Test', email: 'test@email.com' },
  expires: '2099-01-01T00:00:00.000Z',
});

describe('PATCH /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', email: 'new@email.com' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('updates name and email successfully', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));

    const updatedUser = {
      id: 'user_1',
      name: 'New Name',
      email: 'new@email.com',
      avatar: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    mockUserUpdate.mockResolvedValue(updatedUser as any);

    const request = new NextRequest('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', email: 'new@email.com' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('New Name');
    expect(data.email).toBe('new@email.com');
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { name: 'New Name', email: 'new@email.com' },
    });
  });

  it('rejects invalid email', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));

    const request = new NextRequest('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Valid Name', email: 'not-an-email' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
  });

  it('rejects empty name', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));

    const request = new NextRequest('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: 'valid@email.com' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 404 when user not found after update', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_missing'));
    mockUserUpdate.mockRejectedValue(new Error('Record to update not found.'));

    const request = new NextRequest('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', email: 'new@email.com' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserUpdate.mockRejectedValue(new Error('DB connection lost'));

    const request = new NextRequest('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', email: 'new@email.com' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update profile');
  });
});
