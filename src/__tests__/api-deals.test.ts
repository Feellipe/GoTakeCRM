import { describe, it, expect } from 'vitest';
import { dealCreateSchema, dealUpdateSchema, validateOrThrow, ValidationError } from '@/lib/validations';

describe('Deal Validation', () => {
  it('validates a correct deal create payload', () => {
    const data = { clientId: 'cl_123', title: 'Test Deal', value: 5000 };
    const result = validateOrThrow(dealCreateSchema, data);
    expect(result.title).toBe('Test Deal');
    expect(result.status).toBe('new'); // default (English)
  });

  it('rejects missing clientId', () => {
    expect(() => validateOrThrow(dealCreateSchema, { title: 'Test', value: 100 }))
      .toThrow(ValidationError);
  });

  it('rejects negative value', () => {
    expect(() => validateOrThrow(dealCreateSchema, {
      clientId: 'cl_123', title: 'Test', value: -100
    })).toThrow(ValidationError);
  });

  it('dealUpdateSchema whitelists only safe fields', () => {
    const result = validateOrThrow(dealUpdateSchema, {
      title: 'Updated', value: 5000, status: 'quoting',
      clientId: 'hacker_attempt', // should be stripped by whitelist
    });
    expect(result).not.toHaveProperty('clientId');
    expect(result.title).toBe('Updated');
  });
});
