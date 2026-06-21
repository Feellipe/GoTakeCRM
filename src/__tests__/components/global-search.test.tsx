// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlobalSearch } from '@/components/global-search';

const mockClients = [
  { id: 'cl_1', name: 'Alice Silva', phone: '+5511999999999', email: 'alice@test.com', eventType: 'wedding', status: 'active', avatar: null },
  { id: 'cl_2', name: 'Bob Santos', phone: '+5511888888888', email: null, eventType: 'corporate', status: 'lead', avatar: null },
];
const mockDeals = [
  { id: 'deal_1', title: 'Wedding Package', status: 'new', value: 8000, client: { name: 'Alice Silva', avatar: null } },
];
const mockBookings = [
  { id: 'b_1', eventType: 'Wedding', eventDate: '2026-07-15', status: 'confirmed', client: { name: 'Alice Silva' } },
];

const mockCallbacks = {
  onSelectClient: vi.fn(),
  onSelectDeal: vi.fn(),
  onSelectBooking: vi.fn(),
  onNavigate: vi.fn(),
};

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a "Search..." button', () => {
    render(
      <GlobalSearch
        clients={mockClients}
        deals={mockDeals}
        bookings={mockBookings}
        {...mockCallbacks}
      />
    );

    expect(screen.getByText('Search...')).toBeInTheDocument();
  });

  it('opens the search dialog when the button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <GlobalSearch
        clients={mockClients}
        deals={mockDeals}
        bookings={mockBookings}
        {...mockCallbacks}
      />
    );

    await user.click(screen.getByText('Search...'));

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/search clients/i)).toBeVisible()
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows clients in the search results when the dialog is open', async () => {
    const user = userEvent.setup();
    render(
      <GlobalSearch
        clients={mockClients}
        deals={mockDeals}
        bookings={mockBookings}
        {...mockCallbacks}
      />
    );

    await user.click(screen.getByText('Search...'));
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/search clients/i)).toBeVisible()
    );

    // Sem termo de busca, os primeiros clientes aparecem.
    // Usamos o telefone unico da Alice para localizar o resultado dela,
    // pois o nome dela tambem aparece nas linhas de deal e booking.
    expect(await screen.findByText('+5511999999999')).toBeInTheDocument();
    expect(screen.getByText('+5511888888888')).toBeInTheDocument();
  });

  it('filters clients by name when typing in the search input', async () => {
    const user = userEvent.setup();
    render(
      <GlobalSearch
        clients={mockClients}
        deals={mockDeals}
        bookings={mockBookings}
        {...mockCallbacks}
      />
    );

    await user.click(screen.getByText('Search...'));
    const input = await screen.findByPlaceholderText(/search clients/i);

    // Digita "Bob" para filtrar pelo nome
    fireEvent.change(input, { target: { value: 'Bob' } });

    await waitFor(() => {
      expect(screen.getByText('Bob Santos')).toBeInTheDocument();
      expect(screen.queryByText('Alice Silva')).not.toBeInTheDocument();
    });
  });

  it('shows a "No results" message when the search has no matches', async () => {
    const user = userEvent.setup();
    render(
      <GlobalSearch
        clients={mockClients}
        deals={mockDeals}
        bookings={mockBookings}
        {...mockCallbacks}
      />
    );

    await user.click(screen.getByText('Search...'));
    const input = await screen.findByPlaceholderText(/search clients/i);

    fireEvent.change(input, { target: { value: 'xyz' } });

    await waitFor(() =>
      expect(screen.getByText(/No results found/i)).toBeInTheDocument()
    );
  });

  it('shows the result count in the dialog footer', async () => {
    const user = userEvent.setup();
    render(
      <GlobalSearch
        clients={mockClients}
        deals={mockDeals}
        bookings={mockBookings}
        {...mockCallbacks}
      />
    );

    await user.click(screen.getByText('Search...'));
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/search clients/i)).toBeVisible()
    );

    // Sem filtro: 2 clientes + 1 deal + 1 booking = 4 resultados
    expect(screen.getByText('4 results')).toBeInTheDocument();
  });

  it('calls onSelectClient when a client result is clicked', async () => {
    const user = userEvent.setup();
    render(
      <GlobalSearch
        clients={mockClients}
        deals={mockDeals}
        bookings={mockBookings}
        {...mockCallbacks}
      />
    );

    await user.click(screen.getByText('Search...'));

    // O nome "Alice Silva" aparece em varias linhas (cliente, deal e booking),
    // entao localizamos o resultado de cliente pelo seu telefone unico e
    // clicamos no botao que o contem.
    const alicePhone = await screen.findByText('+5511999999999');
    const clientButton = alicePhone.closest('button')!;

    await user.click(clientButton);

    expect(mockCallbacks.onSelectClient).toHaveBeenCalledTimes(1);
    expect(mockCallbacks.onSelectClient).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cl_1', name: 'Alice Silva' })
    );
  });
});
