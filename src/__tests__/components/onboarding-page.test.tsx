// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockRouterPush })),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingPage from '@/app/(dashboard)/onboarding/page';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Onboarding Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'org_1', name: 'My Workspace' }) });
  });

  it('renders onboarding page with welcome text', async () => {
    render(<OnboardingPage />);
    expect(screen.getByText(/vamos começar/i)).toBeInTheDocument();
    expect(screen.getByText(/criar meu workspace/i)).toBeInTheDocument();
  });

  it('calls /api/auth/onboard when clicking create workspace', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);
    await user.click(screen.getByText(/criar meu workspace/i));
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('redirects to /dashboard after successful onboarding', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);
    await user.click(screen.getByText(/criar meu workspace/i));
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
