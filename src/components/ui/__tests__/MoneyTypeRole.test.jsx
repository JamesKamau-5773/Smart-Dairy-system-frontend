import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Money from '../Money';

const outer = (ui) => render(ui).container.firstChild;

describe('Money type roles', () => {
  it('is body text by default, with the symbol and decimals at the same size', () => {
    const money = outer(<Money amount={1234.5} />);
    expect(money.className).toContain('text-body');
    expect(money.className).toContain('tabular-nums');
    expect(money.innerHTML).not.toMatch(/text-(xs|sm|\[)/);
  });

  it('uses stat-value for summary figures and maps the old large presets to it', () => {
    expect(outer(<Money amount={1} size="stat-value" />).className).toContain('text-stat-value');
    expect(outer(<Money amount={1} size="xl" />).className).toContain('text-stat-value');
  });

  it('lets a caller make a body figure strong without keeping both roles', () => {
    const { className } = outer(<Money amount={-5} tone="signed" className="text-body-strong" />);
    expect(className).toContain('text-body-strong');
    expect(className.split(' ')).not.toContain('text-body');
    expect(className).toContain('text-money-negative');
  });
});
