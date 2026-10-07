import { type OfflineAccessProviderProps, OfflineContext, useOfflineAccessProvider } from "./offline-access.ts";

export { useCanMutate, useOfflineAccess, useReadAccountId, useVerifiedUser } from "./offline-access.ts";

export function OfflineAccessProvider({ children, ...options }: OfflineAccessProviderProps) {
  const access = useOfflineAccessProvider(options);
  return <OfflineContext.Provider value={access}>{children}</OfflineContext.Provider>;
}
