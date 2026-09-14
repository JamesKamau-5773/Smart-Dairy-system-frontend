import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExpenseModal from '../ExpenseModal';

describe('ExpenseModal', () => {
  it('saves the commodity name as item_name for expense entries', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { container } = render(createElement(ExpenseModal, { isOpen: true, onClose, onSave }));

    fireEvent.change(container.querySelector('input[name="date"]'), { target: { value: '2026-08-28' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1800' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. AgroVet Supply'), { target: { value: 'Kamau Feeds' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Maize Meal, Dairy Meal, Vet Drugs'), { target: { value: '  Maize Meal  ' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 50'), { target: { value: '50' } });

    fireEvent.click(screen.getByRole('button', { name: /save expense/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      itemName: '  Maize Meal  ',
      item_name: 'Maize Meal',
      quantity: 50,
      cost_class: 'COGS',
      paidTo: 'Kamau Feeds',
    }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
