import { describe, it, expect } from 'vitest';
import { clientCreateSchema, clientUpdateSchema, validateOrThrow, ValidationError } from '@/lib/validations';

describe('Client Validation', () => {
  it('validates a correct client create payload', () => {
    const data = { phone: '+5511999999999', name: 'Test Client', eventType: 'wedding', source: 'whatsapp' };
    const result = validateOrThrow(clientCreateSchema, data);
    expect(result.name).toBe('Test Client');
    expect(result.status).toBe('active'); // default
  });

  it('rejects missing phone', () => {
    expect(() => validateOrThrow(clientCreateSchema, { name: 'Test', eventType: 'wedding' }))
      .toThrow(ValidationError);
  });

  it('rejects invalid email', () => {
    expect(() => validateOrThrow(clientCreateSchema, {
      phone: '+5511999999999', name: 'Test', eventType: 'wedding', email: 'not-an-email'
    })).toThrow(ValidationError);
  });

  it('allows partial update with clientUpdateSchema', () => {
    const result = validateOrThrow(clientUpdateSchema, { name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });
});
