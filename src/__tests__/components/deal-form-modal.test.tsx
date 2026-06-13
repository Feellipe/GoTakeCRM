// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DealFormModal } from '@/components/deal-form-modal';

describe('DealFormModal', () => {
  // Lista de clientes usada pelo select de cliente
  const clients = [{ id: 'cl_1', name: 'Alice' }];

  // Deal usado no modo de edicao
  const editingDeal = {
    id: 'deal_1',
    title: 'Wedding',
    description: 'Test',
    status: 'quoting',
    value: 5000,
    clientId: 'cl_1',
    client: { id: 'cl_1', name: 'Alice' },
  };

  it('1. renders nothing when open=false', () => {
    render(
      <DealFormModal
        open={false}
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={vi.fn()}
      />,
    );

    expect(screen.queryByText('New Deal')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit Deal')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Deal Title/i)).not.toBeInTheDocument();
  });

  it('2. shows "New Deal" title when creating', async () => {
    render(
      <DealFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByText('New Deal')).toBeInTheDocument();
  });

  it('3. shows "Edit Deal" title when editing', async () => {
    render(
      <DealFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        deal={editingDeal}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(await screen.findByText('Edit Deal')).toBeInTheDocument();
  });

  it('4. shows form fields: title input, description textarea, value input', async () => {
    render(
      <DealFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={vi.fn()}
      />,
    );

    await screen.findByText('New Deal');

    const titleInput = screen.getByLabelText(/Deal Title/i);
    const descriptionTextarea = screen.getByLabelText(/Description/i);
    const valueInput = screen.getByLabelText(/Deal Value/i);

    expect(titleInput.tagName).toBe('INPUT');
    expect(descriptionTextarea.tagName).toBe('TEXTAREA');
    expect(valueInput.tagName).toBe('INPUT');
  });

  it('5. shows status stage buttons (New, Briefing, Quoting, Production, Completed)', async () => {
    render(
      <DealFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={vi.fn()}
      />,
    );

    await screen.findByText('New Deal');

    // Os botoes de estagio do pipeline possuem texto com as labels dos status
    expect(screen.getByRole('button', { name: /New/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Briefing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quoting/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Production/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Completed/i })).toBeInTheDocument();
  });

  it('6. shows "Create Deal" submit button', async () => {
    render(
      <DealFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: /Create Deal/i })).toBeInTheDocument();
  });

  it('7. calls onSave with form data on submit', async () => {
    const onSave = vi.fn();

    render(
      <DealFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={onSave}
      />,
    );

    await screen.findByText('New Deal');

    const titleInput = screen.getByLabelText(/Deal Title/i);
    const descriptionTextarea = screen.getByLabelText(/Description/i);
    const valueInput = screen.getByLabelText(/Deal Value/i);

    fireEvent.change(titleInput, { target: { value: 'Corporate Shoot' } });
    fireEvent.change(descriptionTextarea, { target: { value: 'Annual event' } });
    fireEvent.change(valueInput, { target: { value: '7500' } });

    const form = titleInput.closest('form')!;
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedData = onSave.mock.calls[0][0];
    expect(savedData.title).toBe('Corporate Shoot');
    expect(savedData.description).toBe('Annual event');
    expect(savedData.value).toBe(7500);
  });

  it('8. shows "Delete" button only when editing', async () => {
    // Modo de criacao: sem botao Delete
    const { rerender } = render(
      <DealFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        onSave={vi.fn()}
      />,
    );

    await screen.findByText('New Deal');
    expect(screen.queryByRole('button', { name: /^Delete$/i })).not.toBeInTheDocument();

    // Modo de edicao: com botao Delete
    rerender(
      <DealFormModal
        open
        onOpenChange={vi.fn()}
        clients={clients}
        deal={editingDeal}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: /^Delete$/i })).toBeInTheDocument();
  });
});
