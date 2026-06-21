import { db } from '@/lib/db';
import { detectCommand } from './commandRouter';
import {
  getActiveSession,
  cleanupOnNewCommand,
  updateSession,
  cancelSessionByPhone,
} from './sessionManager';
import { FLOWS } from './flows/index';

/**
 * Flow Orchestrator — decision engine for WhatsApp message handling.
 *
 * Decision Table (4 combinations):
 * | Active Session? | Input Type  | Action                                           |
 * |:--------------:|:-----------:|--------------------------------------------------|
 * | ❌             | Is command  | Creates session, runs step 0 of flow             |
 * | ✅             | Not command | Runs current step with input via flow handler    |
 * | ✅             | /cancelar   | Cancels session, confirms cancellation           |
 * | ✅             | Other cmd   | Replaces session (delete old, create new), step 0|
 *
 * @param phone - WhatsApp phone number (digits only)
 * @param body - Raw message text from WhatsApp
 * @returns Response message string (empty if ignored)
 */
export async function handleMessage(
  phone: string,
  body: string
): Promise<string> {
  // 1. Detect if the input is a valid slash command
  const detected = detectCommand(body);

  // 2. Check for an active session
  const session = await getActiveSession(phone);

  // ─── No active session ──────────────────────────────────────────
  if (!session) {
    if (!detected) {
      // No session + not a command → nothing to do
      return '';
    }

    // No session + command → create session and run step 0
    const newSession = await cleanupOnNewCommand(phone, detected.command);
    const flow = FLOWS.get(detected.command);
    if (!flow) {
      await db.commandSession.deleteMany({ where: { phone } });
      return '';
    }

    try {
      const result = await flow.handle('', {}, 0);

      // Update session data for the next step
      if (result.nextStep !== null) {
        await updateSession(newSession.id, result.updatedData);
      } else {
        // Flow completed immediately (e.g., /ajuda with totalSteps=0)
        await db.commandSession.deleteMany({ where: { phone } });
      }

      return result.message;
    } catch (error: unknown) {
      await db.commandSession.deleteMany({ where: { phone } });
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';
      return `Erro ao processar comando: ${message}`;
    }
  }

  // ─── Has active session ─────────────────────────────────────────

  // Active session + /cancelar
  if (detected && detected.command === 'cancelar') {
    await cancelSessionByPhone(phone);
    return '✅ Fluxo cancelado com sucesso!';
  }

  // Active session + other command → replace session
  if (detected) {
    const newSession = await cleanupOnNewCommand(phone, detected.command);
    const flow = FLOWS.get(detected.command);
    if (!flow) {
      await db.commandSession.deleteMany({ where: { phone } });
      return '';
    }

    try {
      const result = await flow.handle('', {}, 0);

      if (result.nextStep !== null) {
        await updateSession(newSession.id, result.updatedData);
      } else {
        await db.commandSession.deleteMany({ where: { phone } });
      }

      return result.message;
    } catch (error: unknown) {
      await db.commandSession.deleteMany({ where: { phone } });
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';
      return `Erro ao processar comando: ${message}`;
    }
  }

  // Active session + not a command → run current step
  const flow = FLOWS.get(session.command);
  if (!flow) {
    // Flow handler not found — clean up orphaned session
    await db.commandSession.deleteMany({ where: { phone } });
    return '';
  }

  try {
    const result = await flow.handle(body, session.data as Record<string, any>, session.step);

    if (result.nextStep === null) {
      // Flow completed — delete session
      await db.commandSession.deleteMany({ where: { phone } });
    } else if (result.nextStep > session.step) {
      // Flow advanced — update session (increment step + save data)
      await updateSession(session.id, result.updatedData);
    }
    // If same step (validation error), don't update session

    return result.message;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro desconhecido';
    return `Erro ao processar: ${message}`;
  }
}
