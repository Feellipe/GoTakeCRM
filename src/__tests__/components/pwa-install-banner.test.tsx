// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { PwaInstallBanner } from '@/components/pwa-install-banner';

vi.mock('@/lib/hooks/use-pwa-install', () => ({
  usePwaInstall: vi.fn(),
}));

import { usePwaInstall } from '@/lib/hooks/use-pwa-install';
const mockUsePwaInstall = vi.mocked(usePwaInstall);

describe('PwaInstallBanner', () => {
  it('renders install prompt when canInstall is true', () => {
    mockUsePwaInstall.mockReturnValue({
      canInstall: true,
      isInstalled: false,
      promptInstall: vi.fn(),
    });
    render(<PwaInstallBanner />);
    expect(screen.getByText('Install GoTakeCRM')).toBeInTheDocument();
    expect(screen.getByText('Install App')).toBeInTheDocument();
  });

  it('does not render when canInstall is false', () => {
    mockUsePwaInstall.mockReturnValue({
      canInstall: false,
      isInstalled: true,
      promptInstall: vi.fn(),
    });
    render(<PwaInstallBanner />);
    expect(screen.queryByText('Install GoTakeCRM')).not.toBeInTheDocument();
  });

  it('hides when dismissed', async () => {
    const user = userEvent.setup();
    mockUsePwaInstall.mockReturnValue({
      canInstall: true,
      isInstalled: false,
      promptInstall: vi.fn(),
    });
    render(<PwaInstallBanner />);
    const dismissButton = screen.getByRole('button', { name: /close/i });
    await user.click(dismissButton);
    expect(screen.queryByText('Install GoTakeCRM')).not.toBeInTheDocument();
  });
});
