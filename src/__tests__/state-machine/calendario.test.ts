import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { calendarioHandler } from '@/lib/whatsapp/flows/calendario';

const mockBooking = (overrides: Record<string, unknown> = {}) => ({
  id: 'booking-1',
  clientId: 'client-1',
  title: 'Casamento João & Maria',
  date: new Date('2026-06-21T10:00:00Z'),
  status: 'confirmed',
  notes: 'Cerimônia na praia',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── FlowHandler interface ──────────────────────────────────────
describe('/calendario — FlowHandler interface', () => {
  it('exports command as "calendario"', () => {
    expect(calendarioHandler.command).toBe('calendario');
  });

  it('exports totalSteps as 2', () => {
    expect(calendarioHandler.totalSteps).toBe(2);
  });
});

// ─── Step 0: Ask period ─────────────────────────────────────────
describe('/calendario — Step 0: Ask period', () => {
  it('asks for period on first call (input ignored)', async () => {
    const result = await calendarioHandler.handle('', {}, 0, 'org-1');

    expect(result.message).toContain('período');
    expect(result.message).toContain('hoje');
    expect(result.message).toContain('semana');
    expect(result.message).toContain('mês');
    expect(result.nextStep).toBe(1);
    expect(result.updatedData).toEqual({});
  });

  it('ignores any input text at step 0', async () => {
    const result = await calendarioHandler.handle('qualquer coisa', {}, 0, 'org-1');

    expect(result.nextStep).toBe(1);
  });
});

// ─── Step 1: Filter by period and show results ──────────────────
describe('/calendario — Step 1: Filter by period', () => {
  it('filters bookings for "hoje" (today)', async () => {
    vi.mocked(db.booking.findMany).mockResolvedValue([mockBooking()]);

    const result = await calendarioHandler.handle('hoje', {}, 1, 'org-1');

    expect(db.booking.findMany).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(db.booking.findMany).mock.calls[0][0];
    // Should filter by today's date range
    expect(callArgs.where.date).toBeDefined();
    expect(callArgs.where.date.gte).toBeDefined();
    expect(callArgs.where.date.lt).toBeDefined();
    expect(callArgs.where.organizationId).toBe('org-1');
    expect(result.nextStep).toBeNull();
  });

  it('filters bookings for "semana" (this week)', async () => {
    vi.mocked(db.booking.findMany).mockResolvedValue([mockBooking()]);

    const result = await calendarioHandler.handle('semana', {}, 1, 'org-1');

    expect(db.booking.findMany).toHaveBeenCalledTimes(1);
    expect(result.nextStep).toBeNull();
  });

  it('filters bookings for "mês" (this month)', async () => {
    vi.mocked(db.booking.findMany).mockResolvedValue([mockBooking()]);

    const result = await calendarioHandler.handle('mês', {}, 1, 'org-1');

    expect(db.booking.findMany).toHaveBeenCalledTimes(1);
    expect(result.nextStep).toBeNull();
  });

  it('accepts "hoje" with mixed case', async () => {
    vi.mocked(db.booking.findMany).mockResolvedValue([mockBooking()]);

    const result = await calendarioHandler.handle('Hoje', {}, 1, 'org-1');

    expect(db.booking.findMany).toHaveBeenCalled();
    expect(result.nextStep).toBeNull();
  });

  it('shows status icons: pending=🟡, confirmed=🟢, completed=✅', async () => {
    const bookings = [
      mockBooking({ id: 'b1', title: 'Pending Booking', status: 'pending' }),
      mockBooking({ id: 'b2', title: 'Confirmed Booking', status: 'confirmed' }),
      mockBooking({ id: 'b3', title: 'Completed Booking', status: 'completed' }),
    ];
    vi.mocked(db.booking.findMany).mockResolvedValue(bookings);

    const result = await calendarioHandler.handle('hoje', {}, 1, 'org-1');

    expect(result.message).toContain('🟡');
    expect(result.message).toContain('🟢');
    expect(result.message).toContain('✅');
  });

  it('shows "Nenhum agendamento" when no bookings found', async () => {
    vi.mocked(db.booking.findMany).mockResolvedValue([]);

    const result = await calendarioHandler.handle('hoje', {}, 1, 'org-1');

    expect(result.message).toBe('Nenhum agendamento encontrado para este período.');
    expect(result.nextStep).toBeNull();
  });

  it('rejects invalid period input', async () => {
    const result = await calendarioHandler.handle('ano', {}, 1, 'org-1');

    expect(result.message).toBe('Por favor, escolha um período válido: hoje, semana ou mês.');
    expect(result.nextStep).toBe(1);
  });

  it('handles DB error gracefully', async () => {
    vi.mocked(db.booking.findMany).mockRejectedValue(new Error('DB error'));

    const result = await calendarioHandler.handle('hoje', {}, 1, 'org-1');

    expect(result.message).toContain('Erro ao processar');
    expect(result.nextStep).toBeNull();
  });
});

// ─── Edge cases ─────────────────────────────────────────────────
describe('/calendario — Edge cases', () => {
  it('handles invalid step number gracefully', async () => {
    const result = await calendarioHandler.handle('test', {}, 99, 'org-1');

    expect(result.message).toContain('Erro');
    expect(result.nextStep).toBeNull();
  });
});
