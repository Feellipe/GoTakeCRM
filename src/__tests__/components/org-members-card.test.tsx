// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/settings'),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { OrgMembersCard } from '@/components/org-members-card';

const mockMembers = [
  {
    id: 'mem_1',
    userId: 'u1',
    organizationId: 'org_1',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z',
    user: { id: 'u1', name: 'Admin', email: 'admin@org.com', avatar: null },
  },
  {
    id: 'mem_2',
    userId: 'u2',
    organizationId: 'org_1',
    role: 'member',
    createdAt: '2026-01-02T00:00:00.000Z',
    user: { id: 'u2', name: 'João Silva', email: 'joao@org.com', avatar: null },
  },
];

describe('OrgMembersCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders member list with role badges', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMembers),
    });

    render(<OrgMembersCard orgId="org_1" />);

    expect(await screen.findByText('admin@org.com')).toBeInTheDocument();
    expect(await screen.findByText('joao@org.com')).toBeInTheDocument();
    expect(await screen.findByText('admin')).toBeInTheDocument();
    expect(await screen.findByText('member')).toBeInTheDocument();
  });

  it('shows invite button', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMembers),
    });

    render(<OrgMembersCard orgId="org_1" />);

    expect(await screen.findByText('Invite Member')).toBeInTheDocument();
  });

  it('opens invite dialog when clicking invite button', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMembers),
    });

    render(<OrgMembersCard orgId="org_1" />);

    const inviteButton = await screen.findByText('Invite Member');
    await userEvent.click(inviteButton);

    expect(screen.getByText('Invite a new member')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<OrgMembersCard orgId="org_1" />);

    expect(await screen.findByText('Failed to load members')).toBeInTheDocument();
  });
});
