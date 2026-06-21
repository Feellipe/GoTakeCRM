import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import {
  createSession,
  getActiveSession,
  updateSession,
  deleteSession,
  cancelSession,
  cleanupOnNewCommand,
} from '@/lib/whatsapp/sessionManager';

// Helper to build a mock session
function mockSession(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: 'session-1',
    phone: '5511999999999',
    command: 'novodeal',
    step: 0,
    data: '{}',
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createSession ─────────────────────────────────────────────────
describe('createSession', () => {
  it('creates a session with 5-minute expiry', async () => {
    const phone = '5511999999999';
    const command = 'novodeal';
    const created = mockSession({ phone, command });

    vi.mocked(db.commandSession.create).mockResolvedValue(created);

    const result = await createSession(phone, command);

    expect(db.commandSession.create).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(db.commandSession.create).mock.calls[0][0];
    expect(callArgs.data.phone).toBe(phone);
    expect(callArgs.data.command).toBe(command);
    expect(callArgs.data.step).toBe(0);
    expect(callArgs.data.data).toBe('{}');
    // Check expiresAt is ~5 minutes from when the test runs (within a tolerance)
    const expiresAt = callArgs.data.expiresAt as Date;
    const fiveMin = 5 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + fiveMin - 1000);
    expect(expiresAt.getTime()).toBeLessThan(Date.now() + fiveMin + 1000);

    expect(result).toEqual(created);
  });

  it('returns the created session object', async () => {
    const phone = '5511999999999';
    const command = 'despesa';
    const created = mockSession({ phone, command, id: 'new-session-id' });

    vi.mocked(db.commandSession.create).mockResolvedValue(created);

    const result = await createSession(phone, command);

    expect(result.id).toBe('new-session-id');
    expect(result.command).toBe('despesa');
  });
});

// ─── getActiveSession ──────────────────────────────────────────────
describe('getActiveSession', () => {
  it('returns an active session for the given phone', async () => {
    const phone = '5511999999999';
    const session = mockSession({ phone });

    vi.mocked(db.commandSession.findFirst).mockResolvedValue(session);

    const result = await getActiveSession(phone);

    expect(db.commandSession.findFirst).toHaveBeenCalledWith({
      where: {
        phone,
        expiresAt: { gt: expect.any(Date) },
      },
    });
    expect(result).toEqual(session);
  });

  it('returns null when no active session exists', async () => {
    vi.mocked(db.commandSession.findFirst).mockResolvedValue(null);

    const result = await getActiveSession('5511999999999');

    expect(result).toBeNull();
  });

  it('returns null when session has expired', async () => {
    vi.mocked(db.commandSession.findFirst).mockResolvedValue(null);

    const result = await getActiveSession('5511888888888');

    expect(result).toBeNull();
  });
});

// ─── updateSession ─────────────────────────────────────────────────
describe('updateSession', () => {
  const existingSession = mockSession({
    id: 'session-1',
    step: 0,
    data: JSON.stringify({ clientName: 'João' }),
  });

  beforeEach(() => {
    vi.mocked(db.commandSession.findUnique).mockResolvedValue(existingSession);
  });

  it('increments step and merges new data', async () => {
    const sessionId = 'session-1';

    vi.mocked(db.commandSession.update).mockResolvedValue({
      ...existingSession,
      step: 1,
      data: JSON.stringify({ clientName: 'João', eventType: 'wedding' }),
    });

    const result = await updateSession(sessionId, { eventType: 'wedding' });

    expect(db.commandSession.findUnique).toHaveBeenCalledWith({
      where: { id: sessionId },
    });
    expect(db.commandSession.update).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(db.commandSession.update).mock.calls[0][0];

    expect(callArgs.where.id).toBe(sessionId);
    expect(callArgs.data.step).toBe(1); // incremented

    // Verify the merged data includes both old and new
    const mergedData = JSON.parse(callArgs.data.data as string);
    expect(mergedData).toEqual({
      clientName: 'João',
      eventType: 'wedding',
    });

    expect(result.step).toBe(1);
  });

  it('works with empty existing data', async () => {
    const sessionId = 'session-2';
    vi.mocked(db.commandSession.findUnique).mockResolvedValue(
      mockSession({ id: sessionId, step: 2, data: '{}' })
    );

    vi.mocked(db.commandSession.update).mockResolvedValue({
      ...mockSession({ id: sessionId, step: 2, data: '{}' }),
      step: 3,
      data: JSON.stringify({ amount: 5000 }),
    });

    const result = await updateSession(sessionId, { amount: 5000 });

    expect(result.step).toBe(3);
  });

  it('overwrites existing keys with new values', async () => {
    const sessionId = 'session-3';
    vi.mocked(db.commandSession.findUnique).mockResolvedValue(
      mockSession({
        id: sessionId,
        data: JSON.stringify({ name: 'Old', status: 'pending' }),
      })
    );

    vi.mocked(db.commandSession.update).mockResolvedValue({
      ...mockSession({ id: sessionId }),
      step: 1,
      data: JSON.stringify({ name: 'New', status: 'pending' }),
    });

    const result = await updateSession(sessionId, { name: 'New' });

    const mergedData = JSON.parse(
      (vi.mocked(db.commandSession.update).mock.calls[0][0].data as any).data as string
    );
    expect(mergedData.name).toBe('New');
    expect(mergedData.status).toBe('pending');
  });
});

// ─── deleteSession ─────────────────────────────────────────────────
describe('deleteSession', () => {
  it('deletes a session by id', async () => {
    vi.mocked(db.commandSession.delete).mockResolvedValue(mockSession());

    await deleteSession('session-1');

    expect(db.commandSession.delete).toHaveBeenCalledWith({
      where: { id: 'session-1' },
    });
  });

  it('does not throw when session does not exist (safe delete)', async () => {
    vi.mocked(db.commandSession.delete).mockRejectedValue(
      Object.assign(new Error('RecordNotFound'), { code: 'P2025' })
    );

    // Should not throw
    await expect(deleteSession('non-existent')).resolves.toBeUndefined();
  });

  it('re-throws non-P2025 errors', async () => {
    const dbError = new Error('Connection lost');
    vi.mocked(db.commandSession.delete).mockRejectedValue(dbError);

    await expect(deleteSession('session-1')).rejects.toThrow('Connection lost');
  });
});

// ─── cancelSession ─────────────────────────────────────────────────
describe('cancelSession', () => {
  it('sets expiresAt to a past time', async () => {
    const session = mockSession({ id: 'session-1' });
    vi.mocked(db.commandSession.update).mockResolvedValue({
      ...session,
      expiresAt: new Date(0),
    });

    await cancelSession('session-1');

    expect(db.commandSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { expiresAt: expect.any(Date) },
    });

    const callArgs = vi.mocked(db.commandSession.update).mock.calls[0][0];
    const expiresAt = callArgs.data.expiresAt as Date;
    expect(expiresAt.getTime()).toBeLessThan(Date.now() + 1000);
  });

  it('does not throw on non-existent session', async () => {
    vi.mocked(db.commandSession.update).mockRejectedValue(
      Object.assign(new Error('RecordNotFound'), { code: 'P2025' })
    );

    await expect(cancelSession('non-existent')).resolves.toBeUndefined();
  });
});

// ─── cleanupOnNewCommand ───────────────────────────────────────────
describe('cleanupOnNewCommand', () => {
  it('deletes old sessions and creates a new one', async () => {
    const phone = '5511999999999';
    const command = 'novodeal';
    const newSession = mockSession({ phone, command, id: 'new-session' });

    vi.mocked(db.commandSession.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(db.commandSession.create).mockResolvedValue(newSession);

    const result = await cleanupOnNewCommand(phone, command);

    expect(db.commandSession.deleteMany).toHaveBeenCalledWith({
      where: { phone },
    });
    expect(db.commandSession.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(newSession);
  });

  it('works when there are no old sessions to clean up', async () => {
    vi.mocked(db.commandSession.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(db.commandSession.create).mockResolvedValue(
      mockSession({ id: 'new-session-2' })
    );

    const result = await cleanupOnNewCommand('5511999999999', 'despesa');

    expect(db.commandSession.deleteMany).toHaveBeenCalled();
    expect(db.commandSession.create).toHaveBeenCalled();
    expect(result.id).toBe('new-session-2');
  });

  it('creates session with 5-minute expiry', async () => {
    vi.mocked(db.commandSession.deleteMany).mockResolvedValue({ count: 0 });
    const created = mockSession({ id: 'new' });
    vi.mocked(db.commandSession.create).mockResolvedValue(created);

    await cleanupOnNewCommand('5511999999999', 'status');

    const callArgs = vi.mocked(db.commandSession.create).mock.calls[0][0];
    const expiresAt = callArgs.data.expiresAt as Date;
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 5 * 60 * 1000 - 1000);
    expect(expiresAt.getTime()).toBeLessThan(Date.now() + 5 * 60 * 1000 + 1000);
  });
});

// ─── Integration-style: phone boundary values ──────────────────────
describe('session manager boundary values', () => {
  it('accepts phone with 9 digits (short)', async () => {
    vi.mocked(db.commandSession.create).mockResolvedValue(
      mockSession({ phone: '551199999' })
    );
    const result = await createSession('551199999', 'ajuda');
    expect(result.phone).toBe('551199999');
  });

  it('accepts phone with 14 digits (long)', async () => {
    vi.mocked(db.commandSession.create).mockResolvedValue(
      mockSession({ phone: '551199999999999' })
    );
    const result = await createSession('551199999999999', 'ajuda');
    expect(result.phone).toBe('551199999999999');
  });

  it('handles getActiveSession for phone with 10 digits', async () => {
    vi.mocked(db.commandSession.findFirst).mockResolvedValue(
      mockSession({ phone: '5511999999' })
    );
    const result = await getActiveSession('5511999999');
    expect(result).not.toBeNull();
    expect(result!.phone).toBe('5511999999');
  });

  it('handles getActiveSession for phone with 13 digits', async () => {
    vi.mocked(db.commandSession.findFirst).mockResolvedValue(
      mockSession({ phone: '55119999999999' })
    );
    const result = await getActiveSession('55119999999999');
    expect(result).not.toBeNull();
    expect(result!.phone).toBe('55119999999999');
  });
});
