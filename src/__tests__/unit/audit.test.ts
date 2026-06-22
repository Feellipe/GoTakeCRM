import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditLog, type AuditAction } from '@/lib/audit';

describe('auditLog', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs client:create action', () => {
    auditLog('client:create', { clientId: 'cl_1', name: 'John' });
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = (console.log as any).mock.calls[0][0];
    expect(output).toContain('[AUDIT]');
    expect(output).toContain('client:create');
  });

  it('logs client:update action', () => {
    auditLog('client:update', { clientId: 'cl_1', changedFields: ['name'] });
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = (console.log as any).mock.calls[0][0];
    expect(output).toContain('client:update');
    expect(output).toContain('cl_1');
  });

  it('logs client:delete action', () => {
    auditLog('client:delete', { clientId: 'cl_1' });
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = (console.log as any).mock.calls[0][0];
    expect(output).toContain('client:delete');
  });

  it('logs deal:create action with JSON details', () => {
    auditLog('deal:create', { dealId: 'd_1', title: 'Wedding' });
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = (console.log as any).mock.calls[0][0];
    expect(output).toContain('deal:create');
    const detailsJson = JSON.stringify({ dealId: 'd_1', title: 'Wedding' });
    expect(output).toContain(detailsJson);
  });

  it('logs booking actions', () => {
    auditLog('booking:create', { bookingId: 'b_1', eventType: 'wedding' });
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = (console.log as any).mock.calls[0][0];
    expect(output).toContain('booking:create');
  });

  it('includes ISO timestamp in output', () => {
    auditLog('client:create', { clientId: 'cl_1' });
    const output = (console.log as any).mock.calls[0][0];
    // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('produces structured format: [AUDIT] timestamp | action | details', () => {
    auditLog('deal:update', { dealId: 'd_1' });
    const output = (console.log as any).mock.calls[0][0];
    expect(output).toMatch(/\[AUDIT\] .+ \| deal:update \| /);
  });
});
