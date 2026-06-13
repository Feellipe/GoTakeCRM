import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@/lib/logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  const originalNodeEnv = process.env.NODE_ENV;

  it('logger.info logs with INFO level in development', () => {
    process.env.NODE_ENV = 'development';
    logger.info('Operation completed');
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = (console.log as any).mock.calls[0][0];
    expect(output).toContain('[INFO]');
    expect(output).toContain('Operation completed');
  });

  it('logger.debug logs with DEBUG level in development', () => {
    process.env.NODE_ENV = 'development';
    logger.debug('Debug message');
    const output = (console.log as any).mock.calls[0][0];
    expect(output).toContain('[DEBUG]');
    expect(output).toContain('Debug message');
  });

  it('logger.warn logs with WARN level in development', () => {
    process.env.NODE_ENV = 'development';
    logger.warn('Warning message');
    const output = (console.log as any).mock.calls[0][0];
    expect(output).toContain('[WARN]');
    expect(output).toContain('Warning message');
  });

  it('logger.error logs with ERROR level in development', () => {
    process.env.NODE_ENV = 'development';
    logger.error('Error occurred', { code: 500 });
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = (console.log as any).mock.calls[0][0];
    expect(output).toContain('[ERROR]');
    expect(output).toContain('Error occurred');
  });

  it('includes data in development output', () => {
    process.env.NODE_ENV = 'development';
    logger.info('User action', { userId: 'u1', action: 'login' });
    const [output, data] = (console.log as any).mock.calls[0];
    expect(output).toContain('[INFO]');
    expect(data).toEqual({ userId: 'u1', action: 'login' });
  });

  it('outputs JSON in production mode', () => {
    process.env.NODE_ENV = 'production';
    logger.info('User action', { userId: 'u1' });
    const output = (console.log as any).mock.calls[0][0];
    // Should be valid JSON
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('User action');
    expect(parsed.data).toEqual({ userId: 'u1' });
    expect(parsed.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('includes timestamp in all log levels', () => {
    process.env.NODE_ENV = 'development';
    logger.info('test');
    const output = (console.log as any).mock.calls[0][0];
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('does not include data field when no data provided in production', () => {
    process.env.NODE_ENV = 'production';
    logger.info('Simple message');
    const output = (console.log as any).mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed).not.toHaveProperty('data');
    expect(parsed.message).toBe('Simple message');
  });
});
