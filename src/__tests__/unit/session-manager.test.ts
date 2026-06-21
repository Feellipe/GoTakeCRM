import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import {
  createSession,
  getActiveSession,
  updateSession,
  deleteSession,
  cancelSession,
  cancelSessionByPhone,
  cleanupOnNewCommand,
  SESSION_TTL_MS,
} from '@/lib/whatsapp/sessionManager';

// Helper to build a mock session
function mockSession(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: 'session-1',
    phone: '5511999999999',
    command: 'novodeal',
    step: 0,
    data: {},
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
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
  it('creates a session with TTL-based expiry', async () => {
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
    expect(callArgs.data.data).toEqual({});

    // Check expiresAt is ~SESSION_TTL_MS from now
    const expiresAt = callArgs.data.expiresAt as Date;
    const diff = expiresAt.getTime() - Date.now();
    expect(diff).toBeGreaterThan(SESSION_TTL_MS - 1000);
    expect(diff).toBeLessThan(SESSION_TTL_MS + 1000);

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
  it('increments step and updates data atomically', async () => {
    const sessionId = 'session-1';
    const updatedSession = mockSession({
      id: sessionId,
      step: 1,
      data: { eventType: 'wedding' },
    });

    vi.mocked(db.commandSession.update).mockResolvedValue(updatedSession);

    const result = await updateSession(sessionId, { eventType: 'wedding' });

    expect(db.commandSession.update).toHaveBeenCalledWith({
      where: { id: sessionId },
      data: {
        step: { increment: 1 },
        data: { eventType: 'wedding' },
      },
    });
    expect(result.step).toBe(1);
    expect(result.data).toEqual({ eventType: 'wedding' });
  });

  it('works with empty data payload', async () => {
    const sessionId = 'session-2';
    vi.mocked(db.commandSession.update).mockResolvedValue(
      mockSession({ id: sessionId, step: 1, data: {} })
    );

    const result = await updateSession(sessionId, {});
    expect(result.step).toBe(1);
    expect(result.data).toEqual({});
  });

  it('throws SessionNotFoundError for non-existent session', async () => {
    vi.mocked(db.commandSession.update).mockRejectedValue(
      Object.assign(new Error('RecordNotFound'), { code: 'P2025' })
    );

    await expect(updateSession('non-existent', {})).rejects.toThrow('Session not found');
  });

  it('re-throws non-P2025 errors', async () => {
    const dbError = new Error('Connection lost');
    vi.mocked(db.commandSession.update).mockRejectedValue(dbError);

    await expect(updateSession('session-1', {})).rejects.toThrow('Connection lost');
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
  it('sets expiresAt to epoch', async () => {
    const session = mockSession({ id: 'session-1' });
    vi.mocked(db.commandSession.update).mockResolvedValue({
      ...session,
      expiresAt: new Date(0),
    });

    await cancelSession('session-1');

    expect(db.commandSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { expiresAt: new Date(0) },
    });
  });

  it('does not throw on non-existent session', async () => {
    vi.mocked(db.commandSession.update).mockRejectedValue(
      Object.assign(new Error('RecordNotFound'), { code: 'P2025' })
    );
    await expect(cancelSession('non-existent')).resolves.toBeUndefined();
  });

  it('re-throws non-P2025 errors', async () => {
    vi.mocked(db.commandSession.update).mockRejectedValue(
      new Error('Connection lost')
    );
    await expect(cancelSession('session-1')).rejects.toThrow('Connection lost');
  });
});

// ─── cancelSessionByPhone ──────────────────────────────────────────
describe('cancelSessionByPhone', () => {
  it('cancels active sessions for the given phone', async () => {
    vi.mocked(db.commandSession.updateMany).mockResolvedValue({ count: 1 });

    const count = await cancelSessionByPhone('5511999999999');

    expect(db.commandSession.updateMany).toHaveBeenCalledWith({
      where: { phone: '5511999999999', expiresAt: { gt: expect.any(Date) } },
      data: { expiresAt: new Date(0) },
    });
    expect(count).toBe(1);
  });

  it('returns 0 when no active session exists', async () => {
    vi.mocked(db.commandSession.updateMany).mockResolvedValue({ count: 0 });
    const count = await cancelSessionByPhone('5511999999999');
    expect(count).toBe(0);
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

  it('creates session with TTL-based expiry', async () => {
    vi.mocked(db.commandSession.deleteMany).mockResolvedValue({ count: 0 });
    const created = mockSession({ id: 'new' });
    vi.mocked(db.commandSession.create).mockResolvedValue(created);

    await cleanupOnNewCommand('5511999999999', 'status');

    const callArgs = vi.mocked(db.commandSession.create).mock.calls[0][0];
    const expiresAt = callArgs.data.expiresAt as Date;
    const diff = expiresAt.getTime() - Date.now();
    expect(diff).toBeGreaterThan(SESSION_TTL_MS - 1000);
    expect(diff).toBeLessThan(SESSION_TTL_MS + 1000);
  });
});
