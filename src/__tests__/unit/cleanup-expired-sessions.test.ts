import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { cleanupExpiredSessions } from '@/lib/whatsapp/cleanupExpiredSessions';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('cleanupExpiredSessions', () => {
  it('deletes expired sessions and returns count', async () => {
    vi.mocked(db.commandSession.deleteMany).mockResolvedValue({ count: 5 });

    const result = await cleanupExpiredSessions();

    expect(db.commandSession.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.commandSession.deleteMany).toHaveBeenCalledWith({
      where: {
        expiresAt: { lt: expect.any(Date) },
      },
    });
    expect(result).toBe(5);
  });

  it('returns 0 when no expired sessions exist', async () => {
    vi.mocked(db.commandSession.deleteMany).mockResolvedValue({ count: 0 });

    const result = await cleanupExpiredSessions();

    expect(result).toBe(0);
    expect(db.commandSession.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('handles batch deletion logic when count equals BATCH_SIZE', async () => {
    // First call returns BATCH_SIZE, second returns 0 to stop the loop
    vi.mocked(db.commandSession.deleteMany)
      .mockResolvedValueOnce({ count: 100 })
      .mockResolvedValueOnce({ count: 0 });

    const result = await cleanupExpiredSessions();

    expect(result).toBe(100);
    expect(db.commandSession.deleteMany).toHaveBeenCalledTimes(2);
  });

  it('handles multiple batches correctly', async () => {
    // Three batches: 100, 100, 50
    vi.mocked(db.commandSession.deleteMany)
      .mockResolvedValueOnce({ count: 100 })
      .mockResolvedValueOnce({ count: 100 })
      .mockResolvedValueOnce({ count: 50 });

    const result = await cleanupExpiredSessions();

    expect(result).toBe(250);
    expect(db.commandSession.deleteMany).toHaveBeenCalledTimes(3);
  });

  it('propagates database errors', async () => {
    const dbError = new Error('Connection refused');
    vi.mocked(db.commandSession.deleteMany).mockRejectedValue(dbError);

    await expect(cleanupExpiredSessions()).rejects.toThrow('Connection refused');
  });
});
