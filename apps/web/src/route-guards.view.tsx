import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingScreen } from "./components/loading-screen.view";
import { getAuthLink, resolveAuthReturnTo } from "./lib/auth-return-to";
import { useRouteAccess } from "./route-guards.model";

export function RequireAuth() {
  const access = useRouteAccess();
  const location = useLocation();
  if (access.hasAccount) {
    return <Outlet />;
  }
  if (access.loading) {
    return <LoadingScreen />;
  }
  return <Navigate to={getAuthLink("/login", location)} replace />;
}

export function GuestOnly() {
  const access = useRouteAccess();
  const location = useLocation();
  if (access.hasAccount) {
    const returnTo = new URLSearchParams(location.search).get("returnTo");
    return <Navigate to={resolveAuthReturnTo(returnTo)} replace />;
  }
  if (access.loading) {
    return <LoadingScreen />;
  }
  return <Outlet />;
}
