import { notifyManager, QueryClientContext, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { createAccessState, selectAccess } from "./offline-access-machine";
import {
  createOfflineAccessRuntime,
  type OfflineAuthData,
  type OfflineRuntimeOptions,
  offlineAuthKey,
} from "./offline-access-runtime";

type Runtime = ReturnType<typeof createOfflineAccessRuntime>;
type Access = ReturnType<Runtime["getSnapshot"]> &
  Pick<
    Runtime,
    | "retryConnection"
    | "retryRestoration"
    | "removeDownload"
    | "retryDownloadCleanup"
    | "signOutLocally"
    | "prepareDownload"
    | "reportLocalLogout"
    | "clearLocalLogout"
    | "confirmSignIn"
  >;
export const OfflineContext = createContext<Access | null>(null);

/** Cached auth identity is not proof of mutation permission; useCanMutate owns that decision. */
export function useVerifiedUser() {
  const client = useContext(QueryClientContext);
  const subscribe = useCallback(
    (listener: () => void) => client?.getQueryCache().subscribe(notifyManager.batchCalls(listener)) ?? (() => {}),
    [client],
  );
  return useSyncExternalStore(
    subscribe,
    () => client?.getQueryData<OfflineAuthData>(offlineAuthKey)?.data.user ?? null,
  );
}

export function useOfflineAccess(): Access {
  const context = useContext(OfflineContext);
  const user = useVerifiedUser();
  return (
    context ?? {
      ...selectAccess(createAccessState({ online: navigator.onLine, userId: user?.id }), Date.now()),
      canReadRemote: navigator.onLine,
      checking: false,
      retryConnection: async () => {},
      retryRestoration: async () => {},
      removeDownload: async () => {},
      retryDownloadCleanup: async () => {},
      signOutLocally: async () => {},
      prepareDownload: async () => {},
      reportLocalLogout: () => {},
      clearLocalLogout: () => {},
      confirmSignIn: () => {},
    }
  );
}
export function useReadAccountId() {
  return useOfflineAccess().readAccountId;
}
export function useCanMutate() {
  return useContext(OfflineContext)?.canMutate ?? navigator.onLine;
}

export type OfflineAccessProviderProps = OfflineRuntimeOptions & { children: ReactNode };

export function useOfflineAccessProvider(options: OfflineRuntimeOptions) {
  const client = useQueryClient();
  const [runtime] = useState(() => createOfflineAccessRuntime(client, options));
  const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);
  useEffect(() => runtime.start(), [runtime]);
  const access = useMemo(
    () => ({
      ...snapshot,
      retryConnection: runtime.retryConnection,
      retryRestoration: runtime.retryRestoration,
      removeDownload: runtime.removeDownload,
      retryDownloadCleanup: runtime.retryDownloadCleanup,
      signOutLocally: runtime.signOutLocally,
      prepareDownload: runtime.prepareDownload,
      reportLocalLogout: runtime.reportLocalLogout,
      clearLocalLogout: runtime.clearLocalLogout,
      confirmSignIn: runtime.confirmSignIn,
    }),
    [snapshot, runtime],
  );
  return access;
}
