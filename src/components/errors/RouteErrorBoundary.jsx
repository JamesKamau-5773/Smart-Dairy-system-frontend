import { useRouteError } from "react-router-dom";

export function RouteErrorBoundary() {
  const error = useRouteError();
  console.error(error);
  return <main className="mx-auto max-w-lg p-6 text-center">
    <h1 className="text-xl font-bold text-ink-strong">This page couldn’t be opened</h1>
    <p className="mt-2 text-sm text-ink-muted">Refresh the page or return to your dashboard. If the problem continues, contact support.</p>
    <a className="mt-4 inline-block font-semibold text-brand underline" href="/dashboard">Go to dashboard</a>
  </main>;
}
