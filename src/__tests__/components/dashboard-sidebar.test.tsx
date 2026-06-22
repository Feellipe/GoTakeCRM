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

    // 7 itens de navegacao devem ser renderizados como links
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

    // A barra lateral continua renderizando e o hook foi chamado
    expect(mockedUsePathname).toHaveBeenCalled();
    expect(screen.getAllByRole('link').length).toBeGreaterThanOrEqual(6);

    // O link de Clients deve existir e receber a classe ativa (bg-gold)
    const clientsLink = screen.getAllByRole('link').find(
      link => link.getAttribute('href') === '/clients'
    );
    expect(clientsLink).toBeDefined();
    expect(clientsLink?.className).toContain('bg-gold');
  });

  it('toggles the collapsed state when the hamburger button is clicked', async () => {
    const user = userEvent.setup();
    render(<DashboardSidebar />);

    // Inicialmente aberta: o texto de marca "WhatsApp" deve estar visivel
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();

    // O botao de colapsar fica no cabecalho (logo) e e sempre o primeiro
    // botao renderizado. Ha tambem o botao de configuracoes no rodape.
    const buttons = screen.getAllByRole('button');
    const toggleButton = buttons[0];
    await user.click(toggleButton);

    // Apos o clique, a barra e colapsada e o texto de marca desaparece
    expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument();

    // Clicar novamente re-expande a barra
    await user.click(screen.getAllByRole('button')[0]);
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
  });

  it('shows the "WhatsApp CRM Dashboard" branding text', () => {
    render(<DashboardSidebar />);

    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('CRM Dashboard')).toBeInTheDocument();
  });
});
