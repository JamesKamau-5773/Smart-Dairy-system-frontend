import path from 'path';

// The public landing page is index.html ("/"); every other HTML route is the SPA in app.html.
// Mirrors the rewrites in vercel.json for `vite` and `vite preview`.
export const serveSpaShell = (req, _res, next) => {
  const pathname = req.url.split('?')[0];
  const isPageRequest = req.method === 'GET' && req.headers.accept?.includes('text/html');
  if (isPageRequest && pathname !== '/' && pathname !== '/index.html' && !path.extname(pathname)) {
    req.url = '/app.html';
  }
  next();
};

export function spaFallback() {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      server.middlewares.use(serveSpaShell);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveSpaShell);
    },
  };
}
