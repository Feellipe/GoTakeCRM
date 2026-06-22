import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ajudaHandler } from '@/lib/whatsapp/flows/ajuda';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── FlowHandler interface ──────────────────────────────────────
describe('/ajuda — FlowHandler interface', () => {
  it('exports command as "ajuda"', () => {
    expect(ajudaHandler.command).toBe('ajuda');
  });

  it('exports totalSteps as 0', () => {
    expect(ajudaHandler.totalSteps).toBe(0);
  });
});

// ─── Single response — no steps needed ──────────────────────────
describe('/ajuda — Response content', () => {
  it('returns help text with all available commands', async () => {
    const result = await ajudaHandler.handle('', {}, 0, 'org-1');

    expect(result.nextStep).toBeNull();
    expect(result.updatedData).toEqual({});

    // Should contain all the commands
    expect(result.message).toContain('/novoDeal');
    expect(result.message).toContain('/despesa');
    expect(result.message).toContain('/receita');
    expect(result.message).toContain('/briefing');
    expect(result.message).toContain('/status');
    expect(result.message).toContain('/contatos');
    expect(result.message).toContain('/calendario');
    expect(result.message).toContain('/ajuda');
    expect(result.message).toContain('/pacotes');
    expect(result.message).toContain('/projeto');
  });

  it('returns help text regardless of step number', async () => {
    const resultStep0 = await ajudaHandler.handle('', {}, 0, 'org-1');
    const resultStep99 = await ajudaHandler.handle('', {}, 99, 'org-1');

    expect(resultStep0.message).toBe(resultStep99.message);
    expect(resultStep0.nextStep).toBeNull();
    expect(resultStep99.nextStep).toBeNull();
  });

  it('ignores any input text', async () => {
    const result = await ajudaHandler.handle('qualquer texto aqui', {}, 0, 'org-1');

    expect(result.nextStep).toBeNull();
    expect(result.updatedData).toEqual({});
  });
});
