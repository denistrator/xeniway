import { useOfflineAccess } from "./features/offline/offline-access";
import { useCurrentUser } from "./lib/queries";

export function useRouteAccess() {
  const user = useCurrentUser();
  const access = useOfflineAccess();
  return {
    hasAccount: Boolean(access.readAccountId),
    loading: access.checking || (user.isPending && access.canReadRemote),
  };
}
