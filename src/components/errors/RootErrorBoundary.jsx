import { useRouteError } from "react-router-dom";

export function RootErrorBoundary() {
  const error = useRouteError();
  console.error(error);
  return <div>Root Error Boundary</div>;
}
