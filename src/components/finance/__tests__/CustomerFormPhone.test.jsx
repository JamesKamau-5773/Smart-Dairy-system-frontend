import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CustomerForm from '../CustomerForm';

void React;
afterEach(cleanup);

const fill = (phone) => {
  const onSave = vi.fn();
  const { container } = render(<CustomerForm onSave={onSave} onCancel={vi.fn()} />);
  fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: 'Mama Njeri Hotel' } });
  fireEvent.change(container.querySelector('input[name="phone_number"]'), { target: { value: phone } });
  fireEvent.submit(container.querySelector('form'));
  return onSave;
};

describe('CustomerForm phone number', () => {
  it('blocks an invalid number with an inline Kenyan-format hint', () => {
    const onSave = fill('12345');
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a Kenyan mobile number, for example 0712 345 678.')).toBeTruthy();
    expect(document.querySelector('input[name="phone_number"]').getAttribute('aria-invalid')).toBe('true');
  });

  it.each(['0712 345 678', '+254 712 345 678', '0112345678'])('accepts %s', (phone) => {
    expect(fill(phone)).toHaveBeenCalled();
  });
});
