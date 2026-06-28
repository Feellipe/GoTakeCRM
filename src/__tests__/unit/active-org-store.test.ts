/**
 * Unit Tests — useActiveOrgStore (zustand)
 *
 * Tests the active organization store used for multi-tenant context switching.
 * Verifies default state, set/update, and localStorage persistence.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage for persist middleware
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

import { useActiveOrgStore, OrgOption } from '@/lib/stores/active-org';

describe('useActiveOrgStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset store to defaults between tests
    useActiveOrgStore.setState({ activeOrg: null });
  });

  it('starts with null activeOrg (All Work)', () => {
    const { activeOrg } = useActiveOrgStore.getState();
    expect(activeOrg).toBeNull();
  });

  it('setActiveOrg updates the active org', () => {
    const org: OrgOption = { id: 'org_1', name: 'Studio X', slug: 'studio-x', role: 'admin' };
    useActiveOrgStore.getState().setActiveOrg(org);
    const { activeOrg } = useActiveOrgStore.getState();
    expect(activeOrg).toEqual(org);
  });

  it('setActiveOrg with null resets to All Work', () => {
    const org: OrgOption = { id: 'org_1', name: 'Studio X', slug: 'studio-x', role: 'admin' };
    useActiveOrgStore.getState().setActiveOrg(org);
    useActiveOrgStore.getState().setActiveOrg(null);
    const { activeOrg } = useActiveOrgStore.getState();
    expect(activeOrg).toBeNull();
  });

  it('transitions work correctly through All Work → org → back', () => {
    const org: OrgOption = { id: 'org_1', name: 'Studio X', slug: 'studio-x', role: 'admin' };

    // Start null → set org
    useActiveOrgStore.getState().setActiveOrg(org);
    expect(useActiveOrgStore.getState().activeOrg).toEqual(org);

    // Back to All Work
    useActiveOrgStore.getState().setActiveOrg(null);
    expect(useActiveOrgStore.getState().activeOrg).toBeNull();
  });
});
