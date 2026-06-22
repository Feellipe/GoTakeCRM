/**
 * Cleanup expired WhatsApp command sessions.
 *
 * Run periodically via cron (e.g., every hour) to prevent the
 * command_sessions table from growing indefinitely.
 *
 * Usage:
 *   npx tsx src/lib/whatsapp/cleanupExpiredSessions.ts
 *
 * Or via Hermes cron:
 *   hermes cron create --schedule "0 * * * *" \
 *     --script src/lib/whatsapp/cleanupExpiredSessions.ts \
 *     --no-agent
 */

import { db } from '@/lib/db';

const BATCH_SIZE = 100;

async function cleanupExpiredSessions(): Promise<number> {
  let totalDeleted = 0;
  let deleted: number;

  do {
    // Delete in batches to avoid long-running transactions
    const result = await db.commandSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    deleted = result.count;
    totalDeleted += deleted;

    // Safety: prevent infinite loops if something goes wrong
    if (deleted === BATCH_SIZE) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } while (deleted === BATCH_SIZE);

  return totalDeleted;
}

// Run when executed directly (skip in test environment)
if (!process.env.VITEST) {
  cleanupExpiredSessions()
    .then((count) => {
      console.log(`Cleaned up ${count} expired session(s)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    });
}

export { cleanupExpiredSessions };
