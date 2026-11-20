import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ToolbarDate from '../ToolbarDate';

afterEach(cleanup);

function Harness({ initial = '' }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <ToolbarDate value={value} onChange={setValue} maxDate="2026-11-16" />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe('ToolbarDate', () => {
  it('says "Any day" until a day is chosen, then shows it as "03 Nov 2026"', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Any day' }));
    const form = await screen.findByRole('form', { name: 'Choose a day' });
    fireEvent.change(within(form).getByLabelText('Day'), { target: { value: '03/11/2026' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Apply' }));
    expect(screen.getByTestId('value').textContent).toBe('2026-11-03');
    expect(screen.getByRole('button', { name: '03 Nov 2026' })).toBeTruthy();
  });

  it('clears the day back to "Any day"', async () => {
    render(<Harness initial="2026-11-03" />);
    fireEvent.click(screen.getByRole('button', { name: '03 Nov 2026' }));
    const form = await screen.findByRole('form', { name: 'Choose a day' });
    fireEvent.click(within(form).getByRole('button', { name: 'Clear' }));
    expect(screen.getByTestId('value').textContent).toBe('');
    expect(screen.getByRole('button', { name: 'Any day' })).toBeTruthy();
  });
});
