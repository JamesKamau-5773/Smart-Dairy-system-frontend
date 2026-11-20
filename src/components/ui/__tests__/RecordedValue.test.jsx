import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import RecordedValue from '../RecordedValue';

afterEach(cleanup);

describe('RecordedValue', () => {
  it('formats a figure the backend sent, including a real 0', () => {
    expect(render(<RecordedValue value={0} format={(n) => `${n} cows`} missingLabel="Not recorded" />).container.textContent).toBe('0 cows');
  });

  it.each([null, undefined, '', Number.NaN])('shows "—" and hidden "Not recorded" for %s', (value) => {
    const { container, getByText } = render(<RecordedValue value={value} format={(n) => `${n} cows`} missingLabel="Not recorded" />);
    expect(container.querySelector('[aria-hidden="true"]').textContent).toBe('—');
    expect(getByText('Not recorded').className).toContain('sr-only');
  });
});
