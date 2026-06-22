import '@testing-library/jest-dom/vitest';

// Polyfills para APIs de layout que o jsdom nao implementa e que componentes
// baseados em Radix UI (ScrollArea, Dialog, etc.) usam internamente.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = '';
  thresholds = [];
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = ResizeObserverStub;
}
if (typeof globalThis.IntersectionObserver === 'undefined') {
  (globalThis as any).IntersectionObserver = IntersectionObserverStub;
}

// Helper to create a mock Prisma model with all common methods
function createModelMock() {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    upsert: vi.fn(),
  };
}

// Global mock for Prisma db client — mocked at the system boundary (per TDD)
vi.mock('@/lib/db', () => ({
  db: {
    // Multi-tenant core models
    user: createModelMock(),
    organization: createModelMock(),
    userOrganization: createModelMock(),
    clientShare: createModelMock(),
    // Business models (top-level)
    client: createModelMock(),
    deal: createModelMock(),
    conversation: createModelMock(),
    booking: createModelMock(),
    document: createModelMock(),
    template: createModelMock(),
    package: createModelMock(),
    proposalTemplate: createModelMock(),
    proposal: createModelMock(),
    dashboardSettings: createModelMock(),
    // Child models
    briefing: createModelMock(),
    expense: createModelMock(),
    revenue: createModelMock(),
    message: createModelMock(),
    // WhatsApp slash commands
    commandSession: createModelMock(),
    // Transaction
    $transaction: vi.fn(),
  },
}));
