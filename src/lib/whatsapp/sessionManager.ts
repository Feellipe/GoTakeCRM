import { db } from '@/lib/db';

/**
 * Creates a new command session with a 5-minute expiry.
 */
export async function createSession(
  phone: string,
  command: string
): Promise<{
  id: string;
  phone: string;
  command: string;
  step: number;
  data: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  return db.commandSession.create({
    data: {
      phone,
      command,
      step: 0,
      data: '{}',
      expiresAt,
    },
  });
}

/**
 * Returns the active session for a given phone, or null if none exists
 * or has expired.
 */
export async function getActiveSession(
  phone: string
): Promise<{
  id: string;
  phone: string;
  command: string;
  step: number;
  data: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  return db.commandSession.findFirst({
    where: {
      phone,
      expiresAt: { gt: new Date() },
    },
  });
}

/**
 * Updates a session: increments the step and merges the partial data into
 * the existing JSON data.
 */
export async function updateSession(
  sessionId: string,
  partialData: Record<string, unknown>
): Promise<{
  id: string;
  phone: string;
  command: string;
  step: number;
  data: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}> {
  // First fetch the current session to get existing data
  const current = await db.commandSession.findUnique({
    where: { id: sessionId },
  });

  if (!current) {
    throw new Error('Session not found');
  }

  const existingData = JSON.parse(current.data || '{}');
  const mergedData = { ...existingData, ...partialData };

  return db.commandSession.update({
    where: { id: sessionId },
    data: {
      step: current.step + 1,
      data: JSON.stringify(mergedData),
    },
  });
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
    if (prismaError.code === 'P2025') {
      // Record not found — safe to ignore
      return;
    }
    throw error;
  }
}

/**
 * Cancels a session by setting its expiresAt to the current time,
 * effectively making it expired immediately.
 * Does not throw if the session doesn't exist.
 */
export async function cancelSession(sessionId: string): Promise<void> {
  try {
    await db.commandSession.update({
      where: { id: sessionId },
      data: { expiresAt: new Date() },
    });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      // Record not found — safe to ignore
      return;
    }
    throw error;
  }
}

/**
 * Cleans up old sessions for a phone and creates a new one.
 * This is the entry point when a user sends a new command that starts a
 * multi-step flow.
 */
export async function cleanupOnNewCommand(
  phone: string,
  command: string
): Promise<{
  id: string;
  phone: string;
  command: string;
  step: number;
  data: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}> {
  // Delete any existing sessions for this phone
  await db.commandSession.deleteMany({
    where: { phone },
  });

  // Create a new session
  return createSession(phone, command);
}
