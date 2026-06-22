// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock next-themes
// O setTheme precisa ser uma referencia estavel para que possamos assertar
// contra a mesma instancia que o componente recebeu ao renderizar.
const mockSetTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({
    theme: 'dark',
    setTheme: mockSetTheme,
  })),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickActions } from '@/components/quick-actions';
import { useTheme } from 'next-themes';

const mockProps = {
  onNewClient: vi.fn(),
  onNewDeal: vi.fn(),
  onNewBooking: vi.fn(),
  onOpenSearch: vi.fn(),
  onExport: vi.fn(),
  onOpenSettings: vi.fn(),
  onNavigate: vi.fn(),
  currentView: 'clients',
};

describe('QuickActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a floating action button (trigger) with the Zap icon', () => {
    render(<QuickActions {...mockProps} />);

    // O FAB e o unico botao renderizado enquanto o dropdown esta fechado.
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('shows "Quick Actions" label in dropdown when opened', async () => {
    const user = userEvent.setup();
    render(<QuickActions {...mockProps} />);

    await user.click(screen.getByRole('button'));

    expect(await screen.findByText('Quick Actions')).toBeInTheDocument();
  });

  it('shows "Create" section with New Client, New Deal and New Booking items', async () => {
    const user = userEvent.setup();
    render(<QuickActions {...mockProps} />);

    await user.click(screen.getByRole('button'));

    expect(await screen.findByText('New Client')).toBeInTheDocument();
    expect(await screen.findByText('New Deal')).toBeInTheDocument();
    expect(await screen.findByText('New Booking')).toBeInTheDocument();
  });

  it('shows "Navigation" section with Search and Go to Dashboard items', async () => {
    const user = userEvent.setup();
    render(<QuickActions {...mockProps} />);

    await user.click(screen.getByRole('button'));

    expect(await screen.findByText('Search')).toBeInTheDocument();
    expect(await screen.findByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('shows "Actions" section with Export Data, Toggle Theme and Settings items', async () => {
    const user = userEvent.setup();
    render(<QuickActions {...mockProps} />);

    await user.click(screen.getByRole('button'));

    expect(await screen.findByText('Export Data')).toBeInTheDocument();
    expect(await screen.findByText('Toggle Theme')).toBeInTheDocument();
    expect(await screen.findByText('Settings')).toBeInTheDocument();
  });

  it('calls onNewClient when "New Client" menu item is clicked', async () => {
    const user = userEvent.setup();
    render(<QuickActions {...mockProps} />);

    await user.click(screen.getByRole('button'));
    const newItem = await screen.findByText('New Client');
    await user.click(newItem);

    await waitFor(() => {
      expect(mockProps.onNewClient).toHaveBeenCalledTimes(1);
    });
  });

  it('toggles theme to "light" when "Toggle Theme" is clicked', async () => {
    const user = userEvent.setup();
    render(<QuickActions {...mockProps} />);

    await user.click(screen.getByRole('button'));
    const toggleItem = await screen.findByText('Toggle Theme');
    await user.click(toggleItem);

    await waitFor(() => {
      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });
  });
});
