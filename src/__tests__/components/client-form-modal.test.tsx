// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientFormModal } from '@/components/client-form-modal';

describe('ClientFormModal', () => {
  // Cliente usado no modo de edicao
  const editingClient = {
    id: 'cl_1',
    phone: '+5511',
    name: 'Alice',
    email: 'alice@test.com',
    eventType: 'Wedding',
    notes: '',
    source: 'WhatsApp',
    status: 'active',
    avatar: null,
  };

  it('1. renders nothing when open=false', () => {
    render(
      <ClientFormModal
        open={false}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    // Quando fechado, nenhum titulo ou campo do formulario deve existir
    expect(screen.queryByText('New Client')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit Client')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Full Name/i)).not.toBeInTheDocument();
  });

  it('2. shows "New Client" title when creating', async () => {
    render(
      <ClientFormModal
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByText('New Client')).toBeInTheDocument();
  });

  it('3. shows "Edit Client" title when editing (client has id)', async () => {
    render(
      <ClientFormModal
        open
        onOpenChange={vi.fn()}
        client={editingClient}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(await screen.findByText('Edit Client')).toBeInTheDocument();
  });

  it('4. populates form fields when editing an existing client', async () => {
    render(
      <ClientFormModal
        open
        onOpenChange={vi.fn()}
        client={editingClient}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await screen.findByText('Edit Client');

    const nameInput = screen.getByLabelText(/Full Name/i) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/Phone/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;

    expect(nameInput.value).toBe('Alice');
    expect(phoneInput.value).toBe('+5511');
    expect(emailInput.value).toBe('alice@test.com');
  });

  it('5. shows form fields: name, phone, email', async () => {
    render(
      <ClientFormModal
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    await screen.findByText('New Client');

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it('6. shows "Add Client" submit button', async () => {
    render(
      <ClientFormModal
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: /Add Client/i })).toBeInTheDocument();
  });

  it('7. shows "Delete" button only when editing', async () => {
    // Modo de criacao: botao Delete nao deve aparecer
    const { rerender } = render(
      <ClientFormModal
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    await screen.findByText('New Client');
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();

    // Modo de edicao: botao Delete deve aparecer
    rerender(
      <ClientFormModal
        open
        onOpenChange={vi.fn()}
        client={editingClient}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('8. calls onSave with form data on submit', async () => {
    const onSave = vi.fn();
    render(
      <ClientFormModal
        open
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    await screen.findByText('New Client');

    const nameInput = screen.getByLabelText(/Full Name/i);
    const phoneInput = screen.getByLabelText(/Phone/i);
    const emailInput = screen.getByLabelText(/Email/i);

    fireEvent.change(nameInput, { target: { value: 'Bob' } });
    fireEvent.change(phoneInput, { target: { value: '+5599' } });
    fireEvent.change(emailInput, { target: { value: 'bob@test.com' } });

    const form = nameInput.closest('form')!;
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedData = onSave.mock.calls[0][0];
    expect(savedData.name).toBe('Bob');
    expect(savedData.phone).toBe('+5599');
    expect(savedData.email).toBe('bob@test.com');
  });

  it('9. calls onOpenChange(false) after submit', async () => {
    const onOpenChange = vi.fn();
    const onSave = vi.fn();

    render(
      <ClientFormModal
        open
        onOpenChange={onOpenChange}
        onSave={onSave}
      />,
    );

    await screen.findByText('New Client');

    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'Carol' } });

    const form = nameInput.closest('form')!;
    fireEvent.submit(form);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('10. calls onDelete when delete button clicked (edit mode)', async () => {
    const onDelete = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ClientFormModal
        open
        onOpenChange={onOpenChange}
        client={editingClient}
        onSave={vi.fn()}
        onDelete={onDelete}
      />,
    );

    const deleteButton = await screen.findByRole('button', { name: /Delete/i });
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
