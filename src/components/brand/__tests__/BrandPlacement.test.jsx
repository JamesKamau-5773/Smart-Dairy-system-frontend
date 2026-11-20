// Each screen shows the logo variant the brand spec gives it (components/brand/BrandLogo).
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AuthLayout from '../../auth/AuthLayout';
import PageSkeleton from '../../ui/PageSkeleton';
import NotFound from '../../../pages/NotFound';
import ReceiptPreview from '../../finance/ReceiptPreview';
import { MemoryRouter } from 'react-router-dom';

afterEach(cleanup);

const logoSrcs = (container) => [...container.querySelectorAll('img[src^="/brand/"]')].map((img) => img.getAttribute('src'));

describe('logo placement', () => {
  it('receipt preview: the horizontal logo at the top, as on the PDF', () => {
    const receipt = { receipt_number: 'RCT-1', status: 'ISSUED', amount: 1200, farm: { name: 'F1' } };
    render(<ReceiptPreview isOpen receipt={receipt} onClose={() => {}} onDownload={() => {}} onShare={() => {}} />);
    const logo = screen.getByRole('img', { name: 'Maziwa Smart' });
    expect(logo.getAttribute('src')).toBe('/brand/logo-horizontal.svg');
    expect(logo.getAttribute('height')).toBe('36');
  });

  it('sign-in screens: the endorsed lock-up, linking to the home page', () => {
    const { container } = render(<AuthLayout><form aria-label="Log in" /></AuthLayout>);
    expect(logoSrcs(container)).toEqual(['/brand/logo-stacked-endorsed.svg']);
    const link = screen.getByRole('link', { name: 'Maziwa Smart home' });
    expect(link.getAttribute('href')).toBe('/');
    expect(link.querySelector('img').getAttribute('width')).toBe('220');
    // The old placeholder logo and typed product name are gone.
    expect(container.querySelector('img[src="/logo.png"]')).toBeNull();
  });

  it('full-page loading: the static mascot at 88px above the loading card', () => {
    const { container } = render(<PageSkeleton variant="card" label="Loading login…" />);
    const mascot = container.querySelector('img[src="/brand/mascot.png"]');
    expect(mascot.getAttribute('height')).toBe('88');
    expect(mascot.className).not.toMatch(/animate/);
    expect(screen.getByRole('status').textContent).toContain('Loading login…');
  });

  it('in-app page loading keeps its skeleton only', () => {
    const { container } = render(<PageSkeleton label="Loading payroll…" />);
    expect(logoSrcs(container)).toEqual([]);
  });

  it('not-found page: the mascot at 96px above the message', () => {
    const { container } = render(<MemoryRouter><NotFound /></MemoryRouter>);
    const mascot = container.querySelector('img[src="/brand/mascot.png"]');
    expect(mascot.getAttribute('height')).toBe('96');
    expect(mascot.compareDocumentPosition(screen.getByRole('heading')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
