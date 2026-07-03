import { useRouteError } from "react-router-dom";

export function RouteErrorBoundary() {
  const error = useRouteError();
  console.error(error);
  return <div>Route Error Boundary</div>;
}
