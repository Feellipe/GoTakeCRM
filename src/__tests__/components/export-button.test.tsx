// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButton } from '@/components/export-button';

const mockData = {
  clients: [
    {
      name: 'Alice',
      phone: '+5511',
      email: 'a@b.com',
      eventType: 'wedding',
      status: 'active',
      source: 'whatsapp',
      totalDeals: 2,
      totalValue: 8000,
    },
  ],
  deals: [
    {
      title: 'Deal 1',
      client: { name: 'Alice' },
      status: 'new',
      value: 5000,
      totalExpenses: 500,
      totalRevenue: 3000,
      profit: 2500,
    },
  ],
  kpis: {
    totalRevenue: 10000,
    totalExpenses: 3000,
    profit: 7000,
    pipelineValue: 20000,
    activeClients: 15,
    totalDeals: 30,
    totalClients: 50,
  },
};

describe('ExportButton', () => {
  it('renders an "Export" button', () => {
    render(<ExportButton data={mockData} />);

    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('shows "Export Clients" menu item on click', async () => {
    const user = userEvent.setup();
    render(<ExportButton data={mockData} />);

    await user.click(screen.getByText('Export'));

    expect(await screen.findByText('Export Clients')).toBeInTheDocument();
  });

  it('shows "Export Deals" menu item', async () => {
    const user = userEvent.setup();
    render(<ExportButton data={mockData} />);

    await user.click(screen.getByText('Export'));

    expect(await screen.findByText('Export Deals')).toBeInTheDocument();
  });

  it('shows "Export Report" menu item', async () => {
    const user = userEvent.setup();
    render(<ExportButton data={mockData} />);

    await user.click(screen.getByText('Export'));

    expect(await screen.findByText('Export Report')).toBeInTheDocument();
  });

  it('does nothing when clients array is empty and export clients is clicked', async () => {
    const emptyData = { ...mockData, clients: [] };

    // O jsdom nao implementa URL.createObjectURL, entao definimos um mock
    // rastreavel antes de interagir com o componente.
    const createObjectURLMock = vi.fn(() => 'mocked-url');
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      configurable: true,
      value: createObjectURLMock,
    });

    const user = userEvent.setup();
    render(<ExportButton data={emptyData} />);

    await user.click(screen.getByText('Export'));

    const exportClientsItem = await screen.findByText('Export Clients');
    await user.click(exportClientsItem);

    // Nao havendo clientes, a funcao retorna cedo e nenhum objeto URL e criado
    expect(createObjectURLMock).not.toHaveBeenCalled();
  });
});
