import { type OfflineAccessProviderProps, OfflineContext, useOfflineAccessProvider } from "./offline-access.model";

export { useCanMutate, useOfflineAccess, useReadAccountId, useVerifiedUser } from "./offline-access.model";

export function OfflineAccessProvider({ children, ...options }: OfflineAccessProviderProps) {
  const access = useOfflineAccessProvider(options);
  return <OfflineContext.Provider value={access}>{children}</OfflineContext.Provider>;
}
