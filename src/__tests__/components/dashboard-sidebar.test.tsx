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
import { usePathname } from 'next/navigation';

const mockedUsePathname = vi.mocked(usePathname);

describe('DashboardSidebar', () => {
  beforeEach(() => {
    mockedUsePathname.mockReturnValue('/dashboard');
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

    // Inicialmente fechada (sidebarOpen = false): o texto "WhatsApp" nao deve estar visivel
    expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument();

    // Hamburger button abre a sidebar (aria-label="Open sidebar")
    const openButton = screen.getByLabelText('Open sidebar');
    await user.click(openButton);

    // Apos o clique, a sidebar abre e o texto aparece
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();

    // Close button fecha a sidebar (aria-label="Close sidebar")
    const closeButton = screen.getByLabelText('Close sidebar');
    await user.click(closeButton);

    // Apos fechar, o texto desaparece
    expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument();
  });

  it('shows the branding text when sidebar is opened', async () => {
    const user = userEvent.setup();
    render(<DashboardSidebar />);

    // Inicialmente fechada: texto nao renderizado
    expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument();
    expect(screen.queryByText('CRM Dashboard')).not.toBeInTheDocument();

    // Abrir sidebar pelo hamburger
    await user.click(screen.getByLabelText('Open sidebar'));

    // Agora o texto deve estar visivel
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('CRM Dashboard')).toBeInTheDocument();
  });
});
