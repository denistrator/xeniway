import { Navigate, Outlet } from "react-router-dom";
import { LoadingScreen } from "./components/loading-screen";
import { useOfflineAccess } from "./features/offline/offline-access";
import { useCurrentUser } from "./lib/queries";

export function RequireAuth() {
  const user = useCurrentUser();
  const access = useOfflineAccess();
  if (access.readAccountId) {
    return <Outlet />;
  }
  if (access.checking || (user.isPending && access.canReadRemote)) {
    return <LoadingScreen />;
  }
  return <Navigate to="/login" replace />;
}

export function GuestOnly() {
  const user = useCurrentUser();
  const access = useOfflineAccess();
  if (access.readAccountId) {
    return <Navigate to="/" replace />;
  }
  if (access.checking || (user.isPending && access.canReadRemote)) {
    return <LoadingScreen />;
  }
  return <Outlet />;
}
