// Valid WhatsApp slash commands (all lowercase for matching)
const VALID_COMMANDS = new Set([
  'novodeal',
  'despesa',
  'receita',
  'briefing',
  'status',
  'contatos',
  'calendario',
  'ajuda',
  'pacotes',
  'projeto',
  'cancelar',
]);

/**
 * Detects a WhatsApp slash command from a text message.
 *
 * @param text - The incoming WhatsApp message text.
 * @returns `{ command: string }` if a valid command is found, or `null` otherwise.
 *          The command is always returned in lowercase.
 */
export function detectCommand(text: string): { command: string } | null {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('/')) return null;

  // Extract the first word after the slash
  const afterSlash = trimmed.slice(1);
  const firstWord = afterSlash.split(/\s+/)[0];

  if (!firstWord) return null;

  const normalized = firstWord.toLowerCase();

  if (VALID_COMMANDS.has(normalized)) {
    return { command: normalized };
  }

  return null;
}
