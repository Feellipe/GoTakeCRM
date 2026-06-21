import { describe, it, expect } from 'vitest';
import { detectCommand } from '@/lib/whatsapp/commandRouter';

describe('detectCommand', () => {
  // ─── Valid commands (exact, lowercase) ───────────────────────────
  it('detects /novodeal', () => {
    expect(detectCommand('/novodeal')).toEqual({ command: 'novodeal' });
  });

  it('detects /despesa', () => {
    expect(detectCommand('/despesa')).toEqual({ command: 'despesa' });
  });

  it('detects /receita', () => {
    expect(detectCommand('/receita')).toEqual({ command: 'receita' });
  });

  it('detects /briefing', () => {
    expect(detectCommand('/briefing')).toEqual({ command: 'briefing' });
  });

  it('detects /status', () => {
    expect(detectCommand('/status')).toEqual({ command: 'status' });
  });

  it('detects /contatos', () => {
    expect(detectCommand('/contatos')).toEqual({ command: 'contatos' });
  });

  it('detects /calendario', () => {
    expect(detectCommand('/calendario')).toEqual({ command: 'calendario' });
  });

  it('detects /ajuda', () => {
    expect(detectCommand('/ajuda')).toEqual({ command: 'ajuda' });
  });

  it('detects /pacotes', () => {
    expect(detectCommand('/pacotes')).toEqual({ command: 'pacotes' });
  });

  it('detects /projeto', () => {
    expect(detectCommand('/projeto')).toEqual({ command: 'projeto' });
  });

  it('detects /cancelar', () => {
    expect(detectCommand('/cancelar')).toEqual({ command: 'cancelar' });
  });

  // ─── Case insensitivity ──────────────────────────────────────────
  it('detects /NOVODEAL in uppercase', () => {
    expect(detectCommand('/NOVODEAL')).toEqual({ command: 'novodeal' });
  });

  it('detects /NovoDeal in mixed case (CamelCase)', () => {
    expect(detectCommand('/NovoDeal')).toEqual({ command: 'novodeal' });
  });

  it('detects /DeSpeSa in random case', () => {
    expect(detectCommand('/DeSpeSa')).toEqual({ command: 'despesa' });
  });

  // ─── Invalid / non-command inputs ────────────────────────────────
  it('returns null for empty string', () => {
    expect(detectCommand('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(detectCommand('   ')).toBeNull();
  });

  it('returns null for text without leading slash', () => {
    expect(detectCommand('novodeal')).toBeNull();
  });

  it('returns null for unknown command', () => {
    expect(detectCommand('/unknown')).toBeNull();
  });

  // ─── Edge cases ──────────────────────────────────────────────────
  it('returns null for just a slash', () => {
    expect(detectCommand('/')).toBeNull();
  });

  it('returns null for string with trailing slash only', () => {
    expect(detectCommand('/ ')).toBeNull();
  });

  it('ignores extra arguments after the command', () => {
    // Command is detected based on the first word only
    expect(detectCommand('/novodeal João Evento')).toEqual({ command: 'novodeal' });
  });

  it('handles leading/trailing whitespace', () => {
    expect(detectCommand('  /ajuda  ')).toEqual({ command: 'ajuda' });
  });

  // ─── Special characters ──────────────────────────────────────────
  it('returns null for command with numbers', () => {
    expect(detectCommand('/novo123')).toBeNull();
  });

  it('returns null for emoji text', () => {
    expect(detectCommand('/🚀')).toBeNull();
  });
});
