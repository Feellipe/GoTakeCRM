import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleMessage } from '@/lib/whatsapp/flowOrchestrator';

vi.mock('@/lib/whatsapp/commandRouter', () => ({
  detectCommand: vi.fn(),
}));

vi.mock('@/lib/whatsapp/sessionManager', () => ({
  getActiveSession: vi.fn(),
  cleanupOnNewCommand: vi.fn(),
  updateSession: vi.fn(),
  cancelSessionByPhone: vi.fn(),
}));

// Re-import after mocks are set up
import { detectCommand } from '@/lib/whatsapp/commandRouter';
import {
  getActiveSession,
  cleanupOnNewCommand,
  updateSession,
  cancelSessionByPhone,
} from '@/lib/whatsapp/sessionManager';

const mockSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'session-1',
  phone: '21999999999',
  command: 'novodeal',
  step: 0,
  data: {},
  expiresAt: new Date(Date.now() + 300000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── No session + command ──────────────────────────────────────────
describe('No session + command', () => {
  it('creates session via cleanupOnNewCommand and runs step 0 of flow', async () => {
    vi.mocked(detectCommand).mockReturnValue({ command: 'novodeal' });
    vi.mocked(getActiveSession).mockResolvedValue(null);
    vi.mocked(cleanupOnNewCommand).mockResolvedValue(mockSession({ id: 'new-session' }));
    vi.mocked(updateSession).mockResolvedValue(mockSession({ step: 1 }));

    const result = await handleMessage('21999999999', '/novodeal');

    expect(vi.mocked(cleanupOnNewCommand)).toHaveBeenCalledWith('21999999999', 'novodeal');
    expect(result).toContain('Qual o nome do cliente?');
  });

  it('handles unknown command gracefully', async () => {
    vi.mocked(detectCommand).mockReturnValue(null);
    vi.mocked(getActiveSession).mockResolvedValue(null);

    const result = await handleMessage('21999999999', 'hello');

    expect(result).toBe('');
  });
});

// ─── Active session + text ─────────────────────────────────────────
describe('Active session + text', () => {
  it('gets active session and runs current step with input', async () => {
    vi.mocked(detectCommand).mockReturnValue(null);
    vi.mocked(getActiveSession).mockResolvedValue(mockSession({ step: 1, data: { clientName: 'Maria' } }));
    vi.mocked(updateSession).mockResolvedValue(mockSession({ step: 2 }));

    const result = await handleMessage('21999999999', 'Maria Silva');

    expect(result).toContain('telefone');
  });

  it('passes text input to the flow handler correctly', async () => {
    vi.mocked(detectCommand).mockReturnValue(null);
    vi.mocked(getActiveSession).mockResolvedValue(mockSession({ step: 0, data: {} }));
    vi.mocked(updateSession).mockResolvedValue(mockSession({ step: 1 }));

    const result = await handleMessage('21999999999', 'João Pedro');

    expect(result).toContain('nome do cliente');
  });
});

// ─── Active session + /cancelar ────────────────────────────────────
describe('Active session + /cancelar', () => {
  it('cancels session via cancelSessionByPhone and returns confirmation', async () => {
    vi.mocked(detectCommand).mockReturnValue({ command: 'cancelar' });
    vi.mocked(getActiveSession).mockResolvedValue(mockSession());
    vi.mocked(cancelSessionByPhone).mockResolvedValue(1);

    const result = await handleMessage('21999999999', '/cancelar');

    expect(vi.mocked(cancelSessionByPhone)).toHaveBeenCalledWith('21999999999');
    expect(result).toContain('cancelado');
  });
});

// ─── Active session + new command ──────────────────────────────────
describe('Active session + new command', () => {
  it('replaces session and runs new step 0', async () => {
    vi.mocked(detectCommand).mockReturnValue({ command: 'status' });
    vi.mocked(getActiveSession).mockResolvedValue(mockSession({ command: 'novodeal' }));
    vi.mocked(cleanupOnNewCommand).mockResolvedValue(mockSession({ id: 'new-session', command: 'status' }));

    const result = await handleMessage('21999999999', '/status');

    expect(vi.mocked(cleanupOnNewCommand)).toHaveBeenCalledWith('21999999999', 'status');
    expect(result).toContain('Qual o ID do projeto?');
  });
});

// ─── No session + no command ──────────────────────────────────────
describe('No session + no command', () => {
  it('returns empty string', async () => {
    vi.mocked(detectCommand).mockReturnValue(null);
    vi.mocked(getActiveSession).mockResolvedValue(null);

    const result = await handleMessage('21999999999', 'hello there');

    expect(result).toBe('');
  });
});
