import { describe, it, expect } from 'vitest';
import {
  clientCreateSchema,
  clientUpdateSchema,
  dealCreateSchema,
  dealUpdateSchema,
  briefingCreateSchema,
  expenseCreateSchema,
  expenseUpdateSchema,
  revenueCreateSchema,
  revenueUpdateSchema,
  bookingCreateSchema,
  bookingUpdateSchema,
  documentCreateSchema,
  packageCreateSchema,
  packageUpdateSchema,
  proposalCreateSchema,
  proposalUpdateSchema,
  proposalTemplateCreateSchema,
  validateOrThrow,
  ValidationError,
  validationErrorResponse,
  validateOrigin,
  EventTypeEnum,
  ClientStatusEnum,
  ClientSourceEnum,
  DealStatusEnum,
  ExpenseCategoryEnum,
  RevenueStatusEnum,
  BookingStatusEnum,
  DocumentTypeEnum,
  DocumentStatusEnum,
  ProposalStatusEnum,
  PackageCategoryEnum,
} from '@/lib/validations';

// ─── Enum Validation ───────────────────────────────────────────

describe('Enums', () => {
  it('EventTypeEnum accepts valid event types', () => {
    const result = EventTypeEnum.parse('wedding');
    expect(result).toBe('wedding');
  });

  it('EventTypeEnum rejects invalid event type', () => {
    expect(() => EventTypeEnum.parse('birthday')).toThrow();
  });

  it('ClientStatusEnum accepts all valid statuses', () => {
    for (const status of ['active', 'lead', 'inactive'] as const) {
      expect(ClientStatusEnum.parse(status)).toBe(status);
    }
  });

  it('DealStatusEnum accepts all valid statuses', () => {
    for (const status of ['new', 'briefing', 'quoting', 'production', 'completed'] as const) {
      expect(DealStatusEnum.parse(status)).toBe(status);
    }
  });

  it('BookingStatusEnum accepts all valid statuses', () => {
    for (const status of ['pending', 'confirmed', 'completed', 'cancelled'] as const) {
      expect(BookingStatusEnum.parse(status)).toBe(status);
    }
  });

  it('ProposalStatusEnum accepts all valid statuses', () => {
    for (const status of ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'] as const) {
      expect(ProposalStatusEnum.parse(status)).toBe(status);
    }
  });
});

// ─── Client Schemas ───────────────────────────────────────────

describe('Client Create Schema', () => {
  const validClient = {
    phone: '+5511999999999',
    name: 'Test Client',
    eventType: 'wedding',
  };

  it('accepts valid payload with all fields', () => {
    const data = {
      ...validClient,
      email: 'test@example.com',
      notes: 'Some notes',
      source: 'instagram',
      status: 'lead',
      avatar: 'https://example.com/avatar.jpg',
    };
    const result = validateOrThrow(clientCreateSchema, data);
    expect(result.phone).toBe('+5511999999999');
    expect(result.name).toBe('Test Client');
    expect(result.email).toBe('test@example.com');
    expect(result.notes).toBe('Some notes');
    expect(result.source).toBe('instagram');
    expect(result.status).toBe('lead');
    expect(result.avatar).toBe('https://example.com/avatar.jpg');
  });

  it('applies defaults for status and source', () => {
    const result = validateOrThrow(clientCreateSchema, validClient);
    expect(result.status).toBe('active');
    expect(result.source).toBe('whatsapp');
  });

  it('accepts nullable email, avatar, and notes', () => {
    const result = validateOrThrow(clientCreateSchema, {
      ...validClient,
      email: null,
      avatar: null,
      notes: null,
    });
    expect(result.email).toBeNull();
    expect(result.avatar).toBeNull();
    expect(result.notes).toBeNull();
  });

  it('accepts missing optional fields', () => {
    const result = validateOrThrow(clientCreateSchema, validClient);
    expect(result.email).toBeUndefined();
    expect(result.notes).toBeUndefined();
    expect(result.avatar).toBeUndefined();
  });

  it('rejects empty phone', () => {
    expect(() =>
      validateOrThrow(clientCreateSchema, { ...validClient, phone: '' })
    ).toThrow(ValidationError);
  });

  it('rejects missing phone', () => {
    expect(() =>
      validateOrThrow(clientCreateSchema, { name: 'Test', eventType: 'wedding' })
    ).toThrow(ValidationError);
  });

  it('rejects empty name', () => {
    expect(() =>
      validateOrThrow(clientCreateSchema, { ...validClient, name: '' })
    ).toThrow(ValidationError);
  });

  it('rejects name exceeding 200 characters', () => {
    expect(() =>
      validateOrThrow(clientCreateSchema, { ...validClient, name: 'a'.repeat(201) })
    ).toThrow(ValidationError);
  });

  it('rejects invalid email format', () => {
    expect(() =>
      validateOrThrow(clientCreateSchema, { ...validClient, email: 'not-an-email' })
    ).toThrow(ValidationError);
  });

  it('rejects invalid eventType', () => {
    expect(() =>
      validateOrThrow(clientCreateSchema, { ...validClient, eventType: 'birthday' })
    ).toThrow(ValidationError);
  });
});

describe('Client Update Schema', () => {
  it('allows partial updates with single field', () => {
    const result = validateOrThrow(clientUpdateSchema, { name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });

  it('allows partial updates with multiple fields', () => {
    const result = validateOrThrow(clientUpdateSchema, {
      name: 'Updated',
      status: 'inactive',
      email: 'new@example.com',
    });
    expect(result.name).toBe('Updated');
    expect(result.status).toBe('inactive');
    expect(result.email).toBe('new@example.com');
  });

  it('allows empty object (no changes)', () => {
    const result = validateOrThrow(clientUpdateSchema, {});
    expect(result).toEqual({});
  });

  it('strips unknown fields via Zod strip', () => {
    const result = validateOrThrow(clientUpdateSchema, {
      name: 'Updated',
      createdAt: 'hacked',
      id: 'hacked',
    } as any);
    expect(result.name).toBe('Updated');
    expect((result as any).createdAt).toBeUndefined();
    expect((result as any).id).toBeUndefined();
  });

  it('rejects invalid email on update', () => {
    expect(() =>
      validateOrThrow(clientUpdateSchema, { email: 'bad-email' })
    ).toThrow(ValidationError);
  });
});

// ─── Deal Schemas ──────────────────────────────────────────────

describe('Deal Create Schema', () => {
  const validDeal = { clientId: 'cl_123', title: 'Test Deal' };

  it('accepts valid payload with all fields', () => {
    const data = {
      ...validDeal,
      description: 'A description',
      status: 'briefing',
      value: 5000,
      currency: 'USD',
    };
    const result = validateOrThrow(dealCreateSchema, data);
    expect(result.clientId).toBe('cl_123');
    expect(result.title).toBe('Test Deal');
    expect(result.description).toBe('A description');
    expect(result.status).toBe('briefing');
    expect(result.value).toBe(5000);
    expect(result.currency).toBe('USD');
  });

  it('applies defaults for status, value, and currency', () => {
    const result = validateOrThrow(dealCreateSchema, validDeal);
    expect(result.status).toBe('new');
    expect(result.value).toBe(0);
    expect(result.currency).toBe('BRL');
  });

  it('accepts nullable description', () => {
    const result = validateOrThrow(dealCreateSchema, { ...validDeal, description: null });
    expect(result.description).toBeNull();
  });

  it('rejects missing clientId', () => {
    expect(() =>
      validateOrThrow(dealCreateSchema, { title: 'Test' })
    ).toThrow(ValidationError);
  });

  it('rejects empty clientId', () => {
    expect(() =>
      validateOrThrow(dealCreateSchema, { clientId: '', title: 'Test' })
    ).toThrow(ValidationError);
  });

  it('rejects missing title', () => {
    expect(() =>
      validateOrThrow(dealCreateSchema, { clientId: 'cl_123' })
    ).toThrow(ValidationError);
  });

  it('rejects negative value', () => {
    expect(() =>
      validateOrThrow(dealCreateSchema, { ...validDeal, value: -100 })
    ).toThrow(ValidationError);
  });

  it('rejects title exceeding 300 characters', () => {
    expect(() =>
      validateOrThrow(dealCreateSchema, { ...validDeal, title: 'a'.repeat(301) })
    ).toThrow(ValidationError);
  });
});

describe('Deal Update Schema', () => {
  it('allows partial update', () => {
    const result = validateOrThrow(dealUpdateSchema, { title: 'Updated', value: 5000 });
    expect(result.title).toBe('Updated');
    expect(result.value).toBe(5000);
  });

  it('whitelists only safe fields (no clientId)', () => {
    const result = validateOrThrow(dealUpdateSchema, {
      title: 'Updated',
      value: 5000,
      clientId: 'hacker_attempt',
    } as any);
    expect(result.title).toBe('Updated');
    expect((result as any).clientId).toBeUndefined();
  });
});

// ─── Briefing Schema ──────────────────────────────────────────

describe('Briefing Create Schema', () => {
  it('accepts valid payload', () => {
    const result = validateOrThrow(briefingCreateSchema, {
      dealId: 'deal_1',
      content: 'Briefing content here',
      author: 'John',
    });
    expect(result.dealId).toBe('deal_1');
    expect(result.content).toBe('Briefing content here');
    expect(result.author).toBe('John');
  });

  it('rejects missing dealId', () => {
    expect(() =>
      validateOrThrow(briefingCreateSchema, { content: 'text', author: 'John' })
    ).toThrow(ValidationError);
  });

  it('rejects empty content', () => {
    expect(() =>
      validateOrThrow(briefingCreateSchema, { dealId: 'd1', content: '', author: 'John' })
    ).toThrow(ValidationError);
  });

  it('rejects missing author', () => {
    expect(() =>
      validateOrThrow(briefingCreateSchema, { dealId: 'd1', content: 'text' })
    ).toThrow(ValidationError);
  });
});

// ─── Expense Schemas ───────────────────────────────────────────

describe('Expense Create Schema', () => {
  const validExpense = {
    dealId: 'deal_1',
    category: 'equipment',
    description: 'Camera rental',
    amount: 500,
  };

  it('accepts valid payload', () => {
    const result = validateOrThrow(expenseCreateSchema, validExpense);
    expect(result.dealId).toBe('deal_1');
    expect(result.category).toBe('equipment');
    expect(result.amount).toBe(500);
  });

  it('applies currency default', () => {
    const result = validateOrThrow(expenseCreateSchema, validExpense);
    expect(result.currency).toBe('BRL');
  });

  it('rejects zero amount', () => {
    expect(() =>
      validateOrThrow(expenseCreateSchema, { ...validExpense, amount: 0 })
    ).toThrow(ValidationError);
  });

  it('rejects negative amount', () => {
    expect(() =>
      validateOrThrow(expenseCreateSchema, { ...validExpense, amount: -50 })
    ).toThrow(ValidationError);
  });

  it('rejects missing description', () => {
    expect(() =>
      validateOrThrow(expenseCreateSchema, { ...validExpense, description: '' })
    ).toThrow(ValidationError);
  });
});

describe('Expense Update Schema', () => {
  it('allows partial update', () => {
    const result = validateOrThrow(expenseUpdateSchema, { amount: 1000, category: 'crew' });
    expect(result.amount).toBe(1000);
    expect(result.category).toBe('crew');
  });
});

// ─── Revenue Schemas ───────────────────────────────────────────

describe('Revenue Create Schema', () => {
  const validRevenue = {
    dealId: 'deal_1',
    amount: 5000,
  };

  it('accepts valid payload with all fields', () => {
    const result = validateOrThrow(revenueCreateSchema, {
      ...validRevenue,
      description: 'Payment 1',
      currency: 'USD',
      date: '2026-01-15',
      status: 'pending',
    });
    expect(result.dealId).toBe('deal_1');
    expect(result.amount).toBe(5000);
    expect(result.description).toBe('Payment 1');
    expect(result.currency).toBe('USD');
    expect(result.status).toBe('pending');
  });

  it('applies defaults for currency and status', () => {
    const result = validateOrThrow(revenueCreateSchema, validRevenue);
    expect(result.currency).toBe('BRL');
    expect(result.status).toBe('received');
  });

  it('accepts nullable description', () => {
    const result = validateOrThrow(revenueCreateSchema, { ...validRevenue, description: null });
    expect(result.description).toBeNull();
  });

  it('rejects zero amount', () => {
    expect(() =>
      validateOrThrow(revenueCreateSchema, { ...validRevenue, amount: 0 })
    ).toThrow(ValidationError);
  });
});

describe('Revenue Update Schema', () => {
  it('allows partial update', () => {
    const result = validateOrThrow(revenueUpdateSchema, { amount: 8000, status: 'pending' });
    expect(result.amount).toBe(8000);
    expect(result.status).toBe('pending');
  });
});

// ─── Booking Schemas ──────────────────────────────────────────

describe('Booking Create Schema', () => {
  const validBooking = {
    clientId: 'cl_1',
    eventType: 'wedding',
    eventDate: '2026-06-15',
  };

  it('accepts valid payload with all fields', () => {
    const result = validateOrThrow(bookingCreateSchema, {
      ...validBooking,
      dealId: 'deal_1',
      duration: 120,
      location: 'Venue A',
      status: 'confirmed',
      notes: 'Special requests',
    });
    expect(result.clientId).toBe('cl_1');
    expect(result.eventType).toBe('wedding');
    expect(result.duration).toBe(120);
    expect(result.location).toBe('Venue A');
    expect(result.status).toBe('confirmed');
  });

  it('applies defaults for duration and status', () => {
    const result = validateOrThrow(bookingCreateSchema, validBooking);
    expect(result.duration).toBe(60);
    expect(result.status).toBe('pending');
  });

  it('accepts nullable dealId, location, and notes', () => {
    const result = validateOrThrow(bookingCreateSchema, {
      ...validBooking,
      dealId: null,
      location: null,
      notes: null,
    });
    expect(result.dealId).toBeNull();
    expect(result.location).toBeNull();
    expect(result.notes).toBeNull();
  });

  it('rejects missing clientId', () => {
    expect(() =>
      validateOrThrow(bookingCreateSchema, { eventType: 'wedding', eventDate: '2026-06-15' })
    ).toThrow(ValidationError);
  });

  it('rejects empty eventType', () => {
    expect(() =>
      validateOrThrow(bookingCreateSchema, { ...validBooking, eventType: '' })
    ).toThrow(ValidationError);
  });

  it('rejects empty eventDate', () => {
    expect(() =>
      validateOrThrow(bookingCreateSchema, { ...validBooking, eventDate: '' })
    ).toThrow(ValidationError);
  });

  it('rejects duration less than 1', () => {
    expect(() =>
      validateOrThrow(bookingCreateSchema, { ...validBooking, duration: 0 })
    ).toThrow(ValidationError);
  });
});

describe('Booking Update Schema', () => {
  it('allows partial update', () => {
    const result = validateOrThrow(bookingUpdateSchema, {
      status: 'completed',
      notes: 'Done',
    });
    expect(result.status).toBe('completed');
    expect(result.notes).toBe('Done');
  });
});

// ─── Document Schema ───────────────────────────────────────────

describe('Document Create Schema', () => {
  it('accepts valid payload', () => {
    const result = validateOrThrow(documentCreateSchema, {
      clientId: 'cl_1',
      type: 'contract',
      title: 'Wedding Contract',
      filename: 'contract.pdf',
      storageUrl: 'https://storage.example.com/contract.pdf',
    });
    expect(result.type).toBe('contract');
    expect(result.title).toBe('Wedding Contract');
  });

  it('accepts nullable dealId', () => {
    const result = validateOrThrow(documentCreateSchema, {
      clientId: 'cl_1',
      type: 'invoice',
      title: 'Invoice',
      filename: 'invoice.pdf',
      storageUrl: 'https://storage.example.com/invoice.pdf',
      dealId: null,
    });
    expect(result.dealId).toBeNull();
  });

  it('rejects missing clientId', () => {
    expect(() =>
      validateOrThrow(documentCreateSchema, {
        type: 'contract',
        title: 'Contract',
        filename: 'c.pdf',
        storageUrl: 'https://example.com/c.pdf',
      })
    ).toThrow(ValidationError);
  });
});

// ─── Package Schemas ───────────────────────────────────────────

describe('Package Create Schema', () => {
  const validPackage = {
    name: 'Gold Package',
    description: 'Premium photography package',
    price: 8000,
    deliverables: '300 photos, album, slideshow',
    duration: 8,
  };

  it('accepts valid payload', () => {
    const result = validateOrThrow(packageCreateSchema, {
      ...validPackage,
      category: 'both',
      active: false,
    });
    expect(result.name).toBe('Gold Package');
    expect(result.price).toBe(8000);
    expect(result.category).toBe('both');
    expect(result.active).toBe(false);
  });

  it('applies category and active defaults', () => {
    const result = validateOrThrow(packageCreateSchema, validPackage);
    expect(result.category).toBe('photography');
    expect(result.active).toBe(true);
  });

  it('rejects zero price', () => {
    expect(() =>
      validateOrThrow(packageCreateSchema, { ...validPackage, price: 0 })
    ).toThrow(ValidationError);
  });

  it('rejects negative price', () => {
    expect(() =>
      validateOrThrow(packageCreateSchema, { ...validPackage, price: -100 })
    ).toThrow(ValidationError);
  });
});

describe('Package Update Schema', () => {
  it('allows partial update', () => {
    const result = validateOrThrow(packageUpdateSchema, { price: 10000, active: false });
    expect(result.price).toBe(10000);
    expect(result.active).toBe(false);
  });
});

// ─── Proposal Schemas ──────────────────────────────────────────

describe('Proposal Create Schema', () => {
  const validProposal = {
    clientId: 'cl_1',
    title: 'Wedding Proposal',
    packages: 'Gold Package',
  };

  it('accepts valid payload with all fields', () => {
    const result = validateOrThrow(proposalCreateSchema, {
      ...validProposal,
      dealId: 'deal_1',
      templateId: 'tpl_1',
      description: 'A wedding proposal',
      status: 'sent',
      customItems: 'Extra drone shots',
      portfolioLinks: 'https://portfolio.com',
      terms: 'Terms and conditions',
      validUntil: '2026-07-15',
      totalValue: 8000,
      currency: 'USD',
      notes: 'Special discount',
    });
    expect(result.clientId).toBe('cl_1');
    expect(result.status).toBe('sent');
    expect(result.totalValue).toBe(8000);
    expect(result.currency).toBe('USD');
  });

  it('applies defaults for status, totalValue, and currency', () => {
    const result = validateOrThrow(proposalCreateSchema, validProposal);
    expect(result.status).toBe('draft');
    expect(result.totalValue).toBe(0);
    expect(result.currency).toBe('BRL');
  });

  it('accepts nullable fields', () => {
    const result = validateOrThrow(proposalCreateSchema, {
      ...validProposal,
      dealId: null,
      templateId: null,
      description: null,
      customItems: null,
      portfolioLinks: null,
      terms: null,
      validUntil: null,
      notes: null,
    });
    expect(result.dealId).toBeNull();
    expect(result.templateId).toBeNull();
  });

  it('rejects missing clientId', () => {
    expect(() =>
      validateOrThrow(proposalCreateSchema, { title: 'Test', packages: 'Pkg' })
    ).toThrow(ValidationError);
  });

  it('rejects negative totalValue', () => {
    expect(() =>
      validateOrThrow(proposalCreateSchema, { ...validProposal, totalValue: -100 })
    ).toThrow(ValidationError);
  });
});

describe('Proposal Update Schema', () => {
  it('allows partial update', () => {
    const result = validateOrThrow(proposalUpdateSchema, {
      status: 'accepted',
      totalValue: 10000,
    });
    expect(result.status).toBe('accepted');
    expect(result.totalValue).toBe(10000);
  });
});

// ─── Proposal Template Schema ─────────────────────────────────

describe('Proposal Template Create Schema', () => {
  const validTemplate = {
    name: 'Wedding Template',
  };

  it('accepts valid payload with all fields', () => {
    const result = validateOrThrow(proposalTemplateCreateSchema, {
      ...validTemplate,
      description: 'A beautiful wedding template',
      defaultTerms: 'Standard terms',
      defaultPackages: 'Gold, Silver',
      coverImage: 'https://example.com/cover.jpg',
      isActive: false,
    });
    expect(result.name).toBe('Wedding Template');
    expect(result.isActive).toBe(false);
  });

  it('applies isActive default', () => {
    const result = validateOrThrow(proposalTemplateCreateSchema, validTemplate);
    expect(result.isActive).toBe(true);
  });

  it('accepts nullable fields', () => {
    const result = validateOrThrow(proposalTemplateCreateSchema, {
      ...validTemplate,
      description: null,
      defaultTerms: null,
      defaultPackages: null,
      coverImage: null,
    });
    expect(result.description).toBeNull();
    expect(result.coverImage).toBeNull();
  });

  it('rejects empty name', () => {
    expect(() =>
      validateOrThrow(proposalTemplateCreateSchema, { name: '' })
    ).toThrow(ValidationError);
  });
});

// ─── validateOrThrow Helper ───────────────────────────────────

describe('validateOrThrow', () => {
  it('returns parsed data on valid input', () => {
    const result = validateOrThrow(clientCreateSchema, {
      phone: '+5511999999999',
      name: 'Test',
      eventType: 'wedding',
    });
    expect(result.name).toBe('Test');
  });

  it('throws ValidationError with messages on invalid input', () => {
    try {
      validateOrThrow(clientCreateSchema, {});
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).errors.length).toBeGreaterThan(0);
    }
  });
});

// ─── ValidationError Class ────────────────────────────────────

describe('ValidationError', () => {
  it('has correct name property', () => {
    const error = new ValidationError(['phone: required']);
    expect(error.name).toBe('ValidationError');
  });

  it('has correct message property', () => {
    const error = new ValidationError(['phone: required']);
    expect(error.message).toBe('Validation failed');
  });

  it('stores all error messages', () => {
    const error = new ValidationError(['phone: required', 'name: required']);
    expect(error.errors).toEqual(['phone: required', 'name: required']);
  });

  it('is an instance of Error', () => {
    const error = new ValidationError(['test']);
    expect(error).toBeInstanceOf(Error);
  });
});

// ─── validationErrorResponse Helper ────────────────────────────

describe('validationErrorResponse', () => {
  it('returns a 422 response', () => {
    const error = new ValidationError(['phone: required', 'name: required']);
    const response = validationErrorResponse(error);
    expect(response.status).toBe(422);
  });

  it('returns JSON with error details', async () => {
    const error = new ValidationError(['phone: required']);
    const response = validationErrorResponse(error);
    const body = await response.json();
    expect(body).toEqual({
      error: 'Validation failed',
      details: ['phone: required'],
    });
  });
});

// ─── validateOrigin Helper ─────────────────────────────────────

describe('validateOrigin', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns true in development mode regardless of headers', () => {
    process.env.NODE_ENV = 'development';
    const request = new Request('http://localhost/api/clients', {
      headers: { origin: 'http://evil.com', host: 'localhost' },
    });
    expect(validateOrigin(request)).toBe(true);
  });

  it('returns true when origin matches host in production', () => {
    process.env.NODE_ENV = 'production';
    const request = new Request('https://myapp.com/api/clients', {
      headers: { origin: 'https://myapp.com', host: 'myapp.com' },
    });
    expect(validateOrigin(request)).toBe(true);
  });

  it('returns false when origin mismatches host in production', () => {
    process.env.NODE_ENV = 'production';
    const request = new Request('https://myapp.com/api/clients', {
      headers: { origin: 'https://evil.com', host: 'myapp.com' },
    });
    expect(validateOrigin(request)).toBe(false);
  });

  it('returns false when both origin and host are missing in production', () => {
    process.env.NODE_ENV = 'production';
    const request = new Request('https://myapp.com/api/clients');
    expect(validateOrigin(request)).toBe(false);
  });

  it('returns true when only host header present in production', () => {
    process.env.NODE_ENV = 'production';
    const request = new Request('https://myapp.com/api/clients', {
      headers: { host: 'myapp.com' },
    });
    expect(validateOrigin(request)).toBe(true);
  });
});
