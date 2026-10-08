import { Navigate, Outlet } from "react-router-dom";
import { LoadingScreen } from "./components/loading-screen.view";
import { useRouteAccess } from "./route-guards.model";

export function RequireAuth() {
  const access = useRouteAccess();
  if (access.hasAccount) {
    return <Outlet />;
  }
  if (access.loading) {
    return <LoadingScreen />;
  }
  return <Navigate to="/login" replace />;
}

export function GuestOnly() {
  const access = useRouteAccess();
  if (access.hasAccount) {
    return <Navigate to="/" replace />;
  }
  if (access.loading) {
    return <LoadingScreen />;
  }
  return <Outlet />;
}
