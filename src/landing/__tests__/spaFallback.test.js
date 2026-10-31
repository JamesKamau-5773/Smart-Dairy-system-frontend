import { describe, expect, it, vi } from 'vitest';
import { serveSpaShell } from '../spaFallback.js';

const route = (url, { method = 'GET', accept = 'text/html,application/xhtml+xml' } = {}) => {
  const req = { url, method, headers: { accept } };
  const next = vi.fn();
  serveSpaShell(req, {}, next);
  expect(next).toHaveBeenCalledOnce();
  return req.url;
};

describe('dev/preview SPA fallback', () => {
  it('serves the landing page at the root', () => {
    expect(route('/')).toBe('/');
    expect(route('/index.html')).toBe('/index.html');
  });

  it('serves the SPA shell for app routes', () => {
    expect(route('/app')).toBe('/app.html');
    expect(route('/dashboard')).toBe('/app.html');
    expect(route('/operations/animal/12?tab=milk')).toBe('/app.html');
  });

  it('passes static files and non-page requests through', () => {
    expect(route('/robots.txt')).toBe('/robots.txt');
    expect(route('/sitemap.xml')).toBe('/sitemap.xml');
    expect(route('/src/main.jsx', { accept: '*/*' })).toBe('/src/main.jsx');
    expect(route('/dashboard', { method: 'POST' })).toBe('/dashboard');
  });
});
