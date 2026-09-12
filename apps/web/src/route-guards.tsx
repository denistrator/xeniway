import { Navigate, Outlet } from "react-router-dom";
import { LoadingScreen } from "./components/loading-screen";
import { useCurrentUser } from "./lib/queries";

export function RequireAuth() {
  const user = useCurrentUser();
  if (user.isPending) return <LoadingScreen />;
  return user.data ? <Outlet /> : <Navigate to="/login" replace />;
}

export function GuestOnly() {
  const user = useCurrentUser();
  if (user.isPending) return <LoadingScreen />;
  return user.data ? <Navigate to="/" replace /> : <Outlet />;
}
