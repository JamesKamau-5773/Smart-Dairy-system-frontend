import { useRouteError } from "react-router-dom";

export function RootErrorBoundary() {
  const error = useRouteError();
  console.error(error);
  return <main className="mx-auto max-w-lg p-6 text-center">
    <h1 className="text-xl font-bold text-ink-strong">The app couldn’t open this page</h1>
    <p className="mt-2 text-sm text-ink-muted">Refresh the page and try again. If the problem continues, contact support.</p>
    <a className="mt-4 inline-block font-semibold text-brand underline" href="/app">Return to the app</a>
  </main>;
}
