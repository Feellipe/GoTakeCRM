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

// Mock next-themes
const mockSetTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({
    theme: 'dark',
    setTheme: mockSetTheme,
  })),
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
import SettingsPage from '@/app/(dashboard)/settings/page';

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock response for /api/auth/me
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          avatar: null,
          lastLoginAt: '2024-01-01T00:00:00Z',
          createdAt: '2023-01-01T00:00:00Z',
        },
        organizations: [
          {
            id: 'org-1',
            name: 'Test Org',
            slug: 'test-org',
            plan: 'pro',
            whatsappPhoneId: '12345',
            whatsappPhone: '+5511999999999',
          },
        ],
      }),
    });
  });

  it('renders the settings page title', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('renders profile section with user data', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    // Check that name and email inputs have correct values
    const nameInput = screen.getByLabelText('Display Name') as HTMLInputElement;
    expect(nameInput.value).toBe('Test User');

    const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
    expect(emailInput.value).toBe('test@example.com');
  });

  it('renders WhatsApp Bot section', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('WhatsApp Bot')).toBeInTheDocument();
    });

    // Check WhatsApp fields
    const phoneIdInput = screen.getByLabelText('Phone ID') as HTMLInputElement;
    expect(phoneIdInput.value).toBe('12345');

    const phoneInput = screen.getByLabelText('Phone Number') as HTMLInputElement;
    expect(phoneInput.value).toBe('+5511999999999');
  });

  it('renders Appearance section with theme selector', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });

  it('renders Notifications section', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    });
  });

  it('renders Data & Sync section', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Data & Sync')).toBeInTheDocument();
    });
  });

  it('renders Security section', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByText('Change Password')).toBeInTheDocument();
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });
  });

  it('has responsive layout classes', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      const container = screen.getByTestId('settings-grid');
      // Should have responsive grid classes
      expect(container.className).toContain('grid');
      expect(container.className).toContain('grid-cols-1');
    });
  });
});
