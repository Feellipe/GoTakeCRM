// @vitest-environment jsdom
import { vi, describe, it, expect } from 'vitest';

// Mock @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: 'transform 200ms',
    isDragging: false,
  })),
}));

// Mock @dnd-kit/utilities CSS
vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DraggableDealCard } from '@/components/draggable-deal-card';

const mockDeal = {
  id: 'deal_1',
  title: 'Wedding Package',
  status: 'new',
  value: 8000,
  clientId: 'cl_1',
  client: { id: 'cl_1', name: 'Alice Silva', avatar: null },
};

// Fabrica de props: cria spies frescos a cada chamada para evitar que chamadas
// de um teste vaze para a assercao do proximo.
function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    deal: mockDeal,
    statusColors: { new: 'bg-blue-500', briefing: 'bg-purple-500', completed: 'bg-warm-700' },
    statusLabels: { new: 'New', briefing: 'Briefing', completed: 'Completed' },
    formatCurrency: (v: number) => `R$ ${v.toLocaleString('pt-BR')}`,
    onClick: vi.fn(),
    onCreateProposal: vi.fn(),
    hasProposal: false,
    ...overrides,
  };
}

describe('DraggableDealCard', () => {
  it('renders the deal title', () => {
    render(<DraggableDealCard {...makeProps()} />);

    expect(screen.getByText('Wedding Package')).toBeInTheDocument();
  });

  it('renders the client name', () => {
    render(<DraggableDealCard {...makeProps()} />);

    expect(screen.getByText('Alice Silva')).toBeInTheDocument();
  });

  it('renders the formatted deal value', () => {
    render(<DraggableDealCard {...makeProps()} />);

    expect(screen.getByText('R$ 8.000')).toBeInTheDocument();
  });

  it('renders "Proposal" button when onCreateProposal is provided and hasProposal is false', () => {
    render(<DraggableDealCard {...makeProps()} />);

    expect(screen.getByText('Proposal')).toBeInTheDocument();
  });

  it('does NOT render "Proposal" button when hasProposal is true', () => {
    render(<DraggableDealCard {...makeProps({ hasProposal: true })} />);

    // Quando hasProposal e verdadeiro, apenas um Badge (nao um Button) e renderizado.
    // Nao deve existir nenhum botao clicavel "Proposal".
    expect(screen.queryByRole('button', { name: /Proposal/i })).not.toBeInTheDocument();
  });

  it('calls onClick when the card is clicked', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    const { container } = render(<DraggableDealCard {...props} />);

    const card = container.querySelector('.glass-card') as HTMLElement;
    await user.click(card);

    expect(props.onClick).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClick when the drag handle (grip) is clicked', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    const { container } = render(<DraggableDealCard {...props} />);

    const grip = container.querySelector('.cursor-grab') as HTMLElement;
    await user.click(grip);

    expect(props.onClick).not.toHaveBeenCalled();
  });
});
