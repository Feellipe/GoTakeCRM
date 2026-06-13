// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingFormModal } from '@/components/booking-form-modal';

describe('BookingFormModal', () => {
  // Lista de clientes usada pelos selects
  const clients = [{ id: 'cl_1', name: 'Alice' }];

  // Booking usado no modo de edicao
  const editingBooking = {
    id: 'b_1',
    clientId: 'cl_1',
    eventType: 'Wedding',
    eventDate: '2026-07-01T10:00',
    duration: 4,
    location: 'Venue',
    status: 'confirmed',
    notes: 'VIP',
    client: { id: 'cl_1', name: 'Alice' },
  };

  it('1. renders nothing when open=false', () => {
    render(
      <BookingFormModal
        open={false}
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={vi.fn()}
      />,
    );

    expect(screen.queryByText('New Booking')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit Booking')).not.toBeInTheDocument();
    expect(screen.queryByText('Schedule Booking')).not.toBeInTheDocument();
  });

  it('2. shows "New Booking" title when creating', async () => {
    render(
      <BookingFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByText('New Booking')).toBeInTheDocument();
  });

  it('3. shows "Schedule Booking" submit button in create mode', async () => {
    render(
      <BookingFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: /Schedule Booking/i })).toBeInTheDocument();
  });

  it('4. shows "Save Changes" button in edit mode', async () => {
    render(
      <BookingFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        booking={editingBooking}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
  });

  it('5. shows "Delete" button only when editing', async () => {
    // Modo de criacao: sem botao Delete
    const { rerender } = render(
      <BookingFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={vi.fn()}
      />,
    );

    await screen.findByText('New Booking');
    expect(screen.queryByRole('button', { name: /^Delete$/i })).not.toBeInTheDocument();

    // Modo de edicao: com botao Delete
    rerender(
      <BookingFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        booking={editingBooking}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: /^Delete$/i })).toBeInTheDocument();
  });

  it('6. calls onSave with form data on submit', async () => {
    const onSave = vi.fn();

    render(
      <BookingFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={onSave}
      />,
    );

    await screen.findByText('New Booking');

    const locationInput = screen.getByLabelText(/Location/i);
    fireEvent.change(locationInput, { target: { value: 'Grand Hall' } });

    const form = locationInput.closest('form')!;
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedData = onSave.mock.calls[0][0];
    expect(savedData.location).toBe('Grand Hall');
  });

  it('7. shows event type and client selects', async () => {
    render(
      <BookingFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={vi.fn()}
      />,
    );

    await screen.findByText('New Booking');

    // Os selects de Event Type e Client possuem labels associadas
    expect(screen.getByText(/Event Type/i)).toBeInTheDocument();
    expect(screen.getByText(/^Client$/i)).toBeInTheDocument();
  });

  it('8. shows status options (Pending, Confirmed, Completed, Cancelled)', async () => {
    render(
      <BookingFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={vi.fn()}
      />,
    );

    await screen.findByText('New Booking');

    // Os botoes de status possuem texto com as labels
    expect(screen.getByRole('button', { name: /Pending/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Completed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelled/i })).toBeInTheDocument();
  });
});
