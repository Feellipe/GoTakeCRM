import { db } from '@/lib/db';

/** Session time-to-live: 5 minutes in milliseconds */
export const SESSION_TTL_MS = 5 * 60 * 1000;

/** Session result interface matching the Prisma CommandSession model */
export interface SessionResult {
  id: string;
  phone: string;
  command: string;
  step: number;
  data: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

function toSessionResult(session: any): SessionResult {
  return {
    ...session,
    data: typeof session.data === 'string' ? JSON.parse(session.data) : (session.data ?? {}),
  };
}

/**
 * Creates a new command session with a TTL-based expiry.
 */
export async function createSession(
  phone: string,
  command: string
): Promise<SessionResult> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await db.commandSession.create({
    data: {
      phone,
      command,
      step: 0,
      data: {},
      expiresAt,
    },
  });
  return toSessionResult(session);
}

/**
 * Returns the active session for a given phone, or null if none exists
 * or has expired. Uses the compound [phone, expiresAt] index.
 */
export async function getActiveSession(
  phone: string
): Promise<SessionResult | null> {
  const session = await db.commandSession.findFirst({
    where: {
      phone,
      expiresAt: { gt: new Date() },
    },
  });
  return session ? toSessionResult(session) : null;
}

/**
 * Updates a session using a single atomic Prisma call.
 * Uses step increment and overwrite data with the provided partial.
 * Throws SessionNotFoundError if the session doesn't exist.
 */
export async function updateSession(
  sessionId: string,
  partialData: Record<string, unknown>
): Promise<SessionResult> {
  try {
    const session = await db.commandSession.update({
      where: { id: sessionId },
      data: {
        step: { increment: 1 },
        data: partialData,
      },
    });
    return toSessionResult(session);
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      throw new SessionNotFoundError(sessionId);
    }
    throw error;
  }
}

/**
 * Deletes a session by ID. Does not throw if the session doesn't exist
 * (swallows Prisma P2025 "RecordNotFound" errors).
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await db.commandSession.delete({
      where: { id: sessionId },
    });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') return;
    throw error;
  }
}

/**
 * Cancels a session by setting its expiresAt to epoch (Jan 1, 1970),
 * reliably making it expired immediately.
 */
export async function cancelSession(sessionId: string): Promise<void> {
  try {
    await db.commandSession.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(0) },
    });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') return;
    throw error;
  }
}

/**
 * Cancels the active session for a given phone by setting expiresAt to epoch.
 * More ergonomic than cancelSession(sessionId) — the router has the phone
 * but not the sessionId.
 */
export async function cancelSessionByPhone(phone: string): Promise<number> {
  const result = await db.commandSession.updateMany({
    where: { phone, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date(0) },
  });
  return result.count;
}

/**
 * Cleans up old sessions for a phone and creates a new one.
 * This is the entry point when a user sends a new command that starts a
 * multi-step flow.
 */
export async function cleanupOnNewCommand(
  phone: string,
  command: string
): Promise<SessionResult> {
  await db.commandSession.deleteMany({
    where: { phone },
  });
  return createSession(phone, command);
}