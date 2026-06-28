// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}));

// Mock next/link as a regular anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock settings panel
vi.mock('@/components/settings-panel', () => ({
  SettingsPanel: ({ trigger }: any) => <div>{trigger}</div>,
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { useActiveOrgStore } from '@/lib/stores/active-org';
import { usePathname } from 'next/navigation';

const mockedUsePathname = vi.mocked(usePathname);

describe('DashboardSidebar', () => {
  beforeEach(() => {
    mockedUsePathname.mockReturnValue('/dashboard');
    // Reset persisted org store between tests so switching an org in one
    // test never leaks into siblings (zustand persist uses localStorage).
    localStorage.clear();
    useActiveOrgStore.setState({ activeOrg: null });
    // Default: return empty orgs for tests that don't care about org fetching
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: 'u1', name: 'Test', email: 'test@email.com', avatar: null },
        organizations: [],
      }),
    });
  });

  it('renders navigation links for all sections', () => {
    render(<DashboardSidebar />);

    const links = screen.getAllByRole('link');

    // 7 itens de navegacao (incluindo Settings) sao renderizados como links
    // No estado inicial fechado, os icones ainda sao links clicaveis
    expect(links.length).toBeGreaterThanOrEqual(7);

    // Verifica cada href esperado
    const hrefs = links.map(link => link.getAttribute('href'));
    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/clients');
    expect(hrefs).toContain('/pipeline');
    expect(hrefs).toContain('/proposals');
    expect(hrefs).toContain('/financials');
    expect(hrefs).toContain('/calendar');
    expect(hrefs).toContain('/settings');
  });

  it('highlights the active nav item based on the current pathname', () => {
    // Simula o usuario navegando para a rota de clientes
    mockedUsePathname.mockReturnValue('/clients');

    render(<DashboardSidebar />);

    expect(mockedUsePathname).toHaveBeenCalled();
    expect(screen.getAllByRole('link').length).toBeGreaterThanOrEqual(6);

    const clientsLink = screen.getAllByRole('link').find(
      link => link.getAttribute('href') === '/clients'
    );
    expect(clientsLink).toBeDefined();
    expect(clientsLink?.className).toContain('bg-gold');
  });

  it('toggles the collapsed state when the hamburger button is clicked', async () => {
    const user = userEvent.setup();
    render(<DashboardSidebar />);

    // Inicialmente fechada: "All Work" nao deve estar visivel
    expect(screen.queryByText('All Work')).not.toBeInTheDocument();

    // Hamburger button abre a sidebar (aria-label="Open sidebar")
    const openButton = screen.getByLabelText('Open sidebar');
    await user.click(openButton);

    // Apos o clique, a sidebar abre e o texto aparece
    expect(screen.getByText('All Work')).toBeInTheDocument();

    // Close button fecha a sidebar (aria-label="Close sidebar")
    const closeButton = screen.getByLabelText('Close sidebar');
    await user.click(closeButton);

    // Apos fechar, o texto desaparece
    expect(screen.queryByText('All Work')).not.toBeInTheDocument();
  });

  it('shows the branding text when sidebar is opened', async () => {
    const user = userEvent.setup();
    render(<DashboardSidebar />);

    // Inicialmente fechada: texto nao renderizado
    expect(screen.queryByText('All Work')).not.toBeInTheDocument();

    // Abrir sidebar pelo hamburger
    await user.click(screen.getByLabelText('Open sidebar'));

    // Agora o contexto deve estar visivel
    expect(screen.getByText('All Work')).toBeInTheDocument();
    expect(screen.getByText('All contexts')).toBeInTheDocument();
  });

  it('renders My Work and org list from API response', async () => {
    const user = userEvent.setup();
    const mockOrgs = [
      { id: 'org_1', name: 'Studio X', slug: 'studio-x', plan: 'pro', role: 'autonomo' },
      { id: 'org_2', name: 'Studio Y', slug: 'studio-y', plan: 'solo', role: 'admin' },
    ];

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: 'u1', name: 'João', email: 'joao@email.com', avatar: null },
        organizations: mockOrgs,
      }),
    });

    render(<DashboardSidebar />);

    // Open sidebar to see text labels
    await user.click(screen.getByLabelText('Open sidebar'));

    // All Work is always shown (default context)
    expect(await screen.findByText('All Work')).toBeInTheDocument();

    // Open the org dropdown to see all options
    await user.click(screen.getByLabelText('Switch context'));

    // My Work is always shown (personal workspace)
    expect(await screen.findByText('My Work')).toBeInTheDocument();

    // Org names from API are rendered
    expect(await screen.findByText('Studio X')).toBeInTheDocument();
    expect(await screen.findByText('Studio Y')).toBeInTheDocument();
  });

  it('switching to a specific org updates the active context display', async () => {
    const user = userEvent.setup();
    const mockOrgs = [
      { id: 'org_1', name: 'Studio X', slug: 'studio-x', role: 'autonomo' },
    ];
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: 'u1', name: 'João', email: 'joao@email.com', avatar: null },
        organizations: mockOrgs,
      }),
    });

    render(<DashboardSidebar />);
    await user.click(screen.getByLabelText('Open sidebar'));
    await user.click(screen.getByLabelText('Switch context'));
    await user.click(screen.getByText('Studio X'));

    // After switching, the display should show Studio X
    expect(screen.getByText('Studio X')).toBeInTheDocument();
    // The subtitle should show the role
    expect(screen.getByText('autonomo')).toBeInTheDocument();
  });
});
