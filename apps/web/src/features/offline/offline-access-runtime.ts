import {
  type DehydratedState,
  hydrate,
  notifyManager,
  type QueryClient,
  QueryObserver,
  type QueryObserverResult,
} from "@tanstack/react-query";
import type { CurrentUserResponse } from "@xeniway/shared";
import {
  ApiRequestError,
  applicationKeys,
  getCurrentUser,
  setAuthenticatedRequestGuard,
  userPreferencesKeys,
} from "../../lib/api";
import { type AccessEvent, createAccessState, selectAccess, transitionAccess } from "./offline-access-machine";
import { clearOfflineLogoutNotice, hasOfflineLogoutNotice, saveOfflineLogoutNotice } from "./offline-logout-notice";
import { offlineQuerySnapshot } from "./offline-query-cache";
import {
  clearOfflineAccount,
  clearOfflineDevice,
  OfflinePreparationChangedError,
  saveOfflineSnapshot,
} from "./offline-store";
import { OFFLINE_RETENTION_MS, type OfflineAccountMetadata } from "./offline-types";
import { prepareOfflineAccount } from "./prepare-offline";
import { checkOfflineWorkerUpdate, prepareOfflineAssets } from "./register-offline-worker";

export const offlineAuthKey = ["auth", "me"] as const;
export type OfflineAuthData = CurrentUserResponse | { data: { user: null } };
export type OfflineRestoration = { account: OfflineAccountMetadata; snapshot: DehydratedState };
export type OfflineRuntimeOptions = {
  initialAccount?: OfflineAccountMetadata | null;
  restoration?: Promise<OfflineRestoration | null>;
};

function readBroadcastMessage(value: unknown) {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return null;
  }
  return {
    type: value.type,
    userId: "userId" in value && typeof value.userId === "number" ? value.userId : undefined,
    preservePublicCsrf: "preservePublicCsrf" in value && value.preservePublicCsrf === true,
  };
}

function isSessionRejected(result: QueryObserverResult<OfflineAuthData>): boolean {
  const isRejectedRequest = result.error instanceof ApiRequestError && [401, 403].includes(result.error.status);
  const isSignedOut = result.isSuccess && result.data.data.user === null;
  return isRejectedRequest || isSignedOut;
}

/** One mounted provider owns one runtime. Construction has no subscriptions or I/O. */
export function createOfflineAccessRuntime(client: QueryClient, options: OfflineRuntimeOptions = {}) {
  const authUser = () => client.getQueryData<OfflineAuthData>(offlineAuthKey)?.data.user;
  let state = createAccessState({
    online: navigator.onLine,
    userId: authUser()?.id,
    account: options.initialAccount,
    restoring: Boolean(options.restoration),
    localLogout: hasOfflineLogoutNotice(),
  });
  if (client.getQueryState(offlineAuthKey)?.error) {
    state = transitionAccess(state, { type: "SESSION_UNAVAILABLE" });
  }
  let snapshot = selectAccess(state, Date.now());
  const listeners = new Set<() => void>();
  const notifySubscribers = () => {
    for (const listener of listeners) {
      listener();
    }
  };
  const scheduleNotification = notifyManager.batchCalls(notifySubscribers);
  let active = false;
  let lifetime = 0;
  let nextOperation = 0;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let persistTimer: ReturnType<typeof setTimeout> | undefined;
  let stopWorkerUpdates: (() => void) | undefined;
  let watchedAccount: OfflineAccountMetadata | null = null;
  let persistenceEnabled = false;
  const removedRestorationOwners = new Set<number>();
  let channel: BroadcastChannel | null = null;

  function dispatch(event: AccessEvent, notification: "scheduled" | "immediate" = "scheduled") {
    const next = transitionAccess(state, event);
    if (next === state) {
      return;
    }
    state = next;
    snapshot = selectAccess(state, Date.now());
    if (notification === "immediate") {
      notifySubscribers();
    } else {
      scheduleNotification();
    }
    if (active) {
      synchronizeDownloadResources();
    }
  }

  function broadcast(message: { type: string; userId?: number; preservePublicCsrf?: boolean }) {
    // The mounted channel does not receive its own messages; a second sender would.
    channel?.postMessage(message);
  }

  function cancelPrivateQueries() {
    void client.cancelQueries({ queryKey: applicationKeys.all });
    client.removeQueries({ queryKey: applicationKeys.all });
  }

  function clearSessionCache(preservePublicCsrf: boolean) {
    void client.cancelQueries({ queryKey: offlineAuthKey, exact: true });
    cancelPrivateQueries();
    client.removeQueries({ queryKey: userPreferencesKeys.all });
    if (!preservePublicCsrf) {
      client.removeQueries({ queryKey: ["auth", "csrf"] });
    }
    client.setQueryData(offlineAuthKey, { data: { user: null } });
  }

  async function clearDeviceRecords() {
    try {
      await clearOfflineDevice();
    } catch (error) {
      dispatch({ type: "STORAGE_FAILED" });
      throw error;
    }
  }

  function rejectSession() {
    if (state.session.status === "signed-out") {
      return;
    }
    const preservePublicCsrf = state.session.status !== "verified";
    dispatch({ type: "SESSION_REJECTED" });
    clearSessionCache(preservePublicCsrf);
    broadcast({ type: "logout", preservePublicCsrf });
    void clearDeviceRecords().catch(() => {});
  }

  function assertWrite() {
    if (!snapshot.canMutate || !navigator.onLine || authUser()?.id !== snapshot.readAccountId) {
      throw new ApiRequestError("Verified online access is required", "OFFLINE_READ_ONLY", 0);
    }
  }

  async function retryConnection() {
    if (!active) {
      return;
    }
    const operation = ++nextOperation;
    const startedLifetime = lifetime;
    dispatch({ type: "VERIFY_STARTED", operation });
    // Invalidation alone can reuse a cold in-flight check from the previous session.
    void client.cancelQueries({ queryKey: offlineAuthKey, exact: true }, { silent: true, revert: false });
    await client.invalidateQueries({ queryKey: offlineAuthKey });
    if (!active || startedLifetime !== lifetime) {
      return;
    }
    const result = client.getQueryState<OfflineAuthData>(offlineAuthKey);
    if (result?.status === "success" && result.data?.data.user && navigator.onLine) {
      dispatch({ type: "VERIFY_SUCCEEDED", operation, userId: result.data.data.user.id });
      if (snapshot.canMutate) {
        void client.invalidateQueries({ queryKey: applicationKeys.all });
      }
    } else {
      dispatch({ type: "VERIFY_FAILED", operation, online: navigator.onLine });
    }
  }

  async function removeDownload() {
    const ownerId = snapshot.account?.userId;
    dispatch({ type: "DOWNLOAD_REMOVED" });
    broadcast({ type: "removed", userId: ownerId });
    try {
      if (ownerId) {
        await clearOfflineAccount(ownerId);
      }
    } catch (error) {
      dispatch({ type: "STORAGE_FAILED" });
      throw error;
    }
  }

  async function signOutLocally(input: { discloseRemoteLimit?: boolean } = {}) {
    dispatch({ type: "SIGNED_OUT" });
    clearSessionCache(false);
    broadcast({ type: "logout" });
    await clearDeviceRecords();
    if (input.discloseRemoteLimit) {
      reportLocalLogout();
    }
  }

  function reportLocalLogout() {
    saveOfflineLogoutNotice();
    dispatch({ type: "LOCAL_LOGOUT_REPORTED", localLogout: true });
  }

  function clearLocalLogout() {
    clearOfflineLogoutNotice();
    dispatch({ type: "LOCAL_LOGOUT_REPORTED", localLogout: false });
  }

  async function prepareDownload(input: { consent: boolean; refresh?: boolean }) {
    const user = authUser();
    const refresh = input.refresh ?? false;
    if (
      import.meta.env.DEV ||
      !active ||
      !user ||
      state.download.status === "preparing" ||
      !snapshot.canMutate ||
      !(refresh ? snapshot.account?.userId === user.id : input.consent)
    ) {
      return;
    }
    assertWrite();
    const operation = ++nextOperation;
    const startedLifetime = lifetime;
    dispatch({ type: "PREPARATION_STARTED", operation, userId: user.id, refresh });
    const assertPreparationOwner = () => {
      assertWrite();
      if (
        !active ||
        startedLifetime !== lifetime ||
        authUser()?.id !== user.id ||
        state.download.status !== "preparing" ||
        state.download.operation !== operation
      ) {
        throw new OfflinePreparationChangedError();
      }
    };
    try {
      const account = await prepareOfflineAccount(
        client,
        user,
        prepareOfflineAssets,
        assertPreparationOwner,
        (progress) => {
          assertPreparationOwner();
          dispatch({ type: "PREPARATION_PROGRESS", operation, progress });
        },
        (userId) => broadcast({ type: "account-replaced", userId }),
      );
      assertPreparationOwner();
      dispatch({ type: "PREPARATION_SUCCEEDED", operation, account });
    } catch {
      if (active && startedLifetime === lifetime) {
        dispatch({ type: "PREPARATION_FAILED", operation });
      }
    }
  }

  async function persist(account: OfflineAccountMetadata) {
    if (!active || !snapshot.canMutate || snapshot.account !== account) {
      return;
    }
    try {
      await saveOfflineSnapshot(
        account.userId,
        offlineQuerySnapshot(client, account.userId),
        account.preparationId ?? null,
      );
    } catch (error) {
      if (!(error instanceof OfflinePreparationChangedError)) {
        dispatch({ type: "STORAGE_FAILED" });
      }
    }
  }

  function synchronizeDownloadResources() {
    const account = snapshot.account;
    const accountChanged = account !== watchedAccount;
    if (accountChanged) {
      clearTimeout(expiryTimer);
      stopWorkerUpdates?.();
      watchedAccount = account;
      if (account) {
        client.setQueryDefaults(applicationKeys.account(account.userId), { gcTime: OFFLINE_RETENTION_MS });
        stopWorkerUpdates = checkOfflineWorkerUpdate(() => dispatch({ type: "WORKER_UPDATE_AVAILABLE" }));
        expiryTimer = setTimeout(
          () => {
            if (snapshot.account !== account) {
              return;
            }
            client.removeQueries({ queryKey: applicationKeys.account(account.userId) });
            dispatch({ type: "DOWNLOAD_EXPIRED", account });
            void clearOfflineAccount(account.userId, account.preparationId ?? null).catch(() =>
              dispatch({ type: "STORAGE_FAILED" }),
            );
          },
          Math.max(0, account.expiresAt - Date.now()),
        );
      }
    }
    const shouldPersist = Boolean(account && snapshot.canMutate && account.userId === snapshot.readAccountId);
    if (!shouldPersist) {
      clearTimeout(persistTimer);
    }
    const needsPersistence = !persistenceEnabled || accountChanged;
    if (shouldPersist && account && needsPersistence) {
      void persist(account);
    }
    persistenceEnabled = shouldPersist;
  }

  function handleRemoteSessionChange(userId: number | undefined) {
    dispatch({ type: "RESTORATION_CANCELLED" });
    if (snapshot.account && snapshot.account.userId !== userId) {
      dispatch({ type: "DOWNLOAD_REPLACED" });
      cancelPrivateQueries();
    }
    void retryConnection();
  }

  function handleMessage(event: MessageEvent) {
    const message = readBroadcastMessage(event.data);
    if (!message) {
      return;
    }
    const userId = message.userId;
    switch (message.type) {
      case "account-replaced":
        dispatch({ type: "DOWNLOAD_REPLACED" });
        if (userId !== authUser()?.id) {
          cancelPrivateQueries();
        }
        break;
      case "session-changed":
        handleRemoteSessionChange(userId);
        break;
      case "removed":
        if (userId !== undefined) {
          removedRestorationOwners.add(userId);
        }
        if (userId !== snapshot.account?.userId) {
          return;
        }
        dispatch({ type: "DOWNLOAD_REMOVED" });
        cancelPrivateQueries();
        break;
      case "logout": {
        const preservePublicCsrf = message.preservePublicCsrf && state.session.status !== "verified";
        dispatch({ type: "SIGNED_OUT" });
        clearSessionCache(preservePublicCsrf);
        break;
      }
    }
  }

  function acceptVerifiedSession(userId: number) {
    const previousOwner = state.session.status === "verified" ? state.session.userId : snapshot.account?.userId;
    const oldAccount = snapshot.account;
    dispatch({ type: "SESSION_VERIFIED", userId });
    if (!previousOwner || previousOwner === userId) {
      return;
    }
    cancelPrivateQueries();
    broadcast({ type: "session-changed", userId });
    if (oldAccount) {
      discardAccountDownload(oldAccount);
    }
  }

  function discardAccountDownload(account: OfflineAccountMetadata) {
    void clearOfflineAccount(account.userId, account.preparationId ?? null).catch(() =>
      dispatch({ type: "STORAGE_FAILED" }),
    );
  }

  function canRestoreAccount(account: OfflineAccountMetadata): boolean {
    const ownerId = authUser()?.id;
    const wasRemoved = removedRestorationOwners.has(account.userId);
    const matchesOwner = !ownerId || ownerId === account.userId;
    const isSignedOut = state.session.status === "signed-out";
    const isUnexpired = account.expiresAt > Date.now();
    return !wasRemoved && matchesOwner && !isSignedOut && isUnexpired;
  }

  function restoreAccount(restored: OfflineRestoration | null, restorationEpoch: number) {
    if (state.epoch !== restorationEpoch) {
      if (restored) {
        discardAccountDownload(restored.account);
      }
      return;
    }
    if (restored && canRestoreAccount(restored.account)) {
      hydrate(client, restored.snapshot);
      dispatch({ type: "RESTORED", epoch: restorationEpoch, account: restored.account });
      return;
    }
    dispatch({ type: "RESTORED", epoch: restorationEpoch, account: null });
    if (restored) {
      discardAccountDownload(restored.account);
    }
  }

  function start() {
    active = true;
    const startedLifetime = ++lifetime;
    channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("xeniway-offline") : null;
    if (channel) {
      channel.onmessage = handleMessage;
    }
    let observedData: OfflineAuthData | undefined;
    let observedAt = -1;
    const observer = new QueryObserver<OfflineAuthData>(client, {
      queryKey: offlineAuthKey,
      queryFn: getCurrentUser,
      retry: false,
      retryOnMount: false,
      staleTime: 60_000,
      networkMode: "always",
    });
    const observeVerifiedSession = (data: OfflineAuthData, updatedAt: number) => {
      const alreadyObserved = observedData === data && observedAt === updatedAt;
      if (!data.data.user || alreadyObserved) {
        return;
      }
      observedData = data;
      observedAt = updatedAt;
      acceptVerifiedSession(data.data.user.id);
    };
    const applySessionResult = (result: QueryObserverResult<OfflineAuthData>) => {
      if (isSessionRejected(result)) {
        rejectSession();
        return;
      }
      if (result.isError) {
        dispatch({ type: "SESSION_UNAVAILABLE" });
        return;
      }
      if (!result.isSuccess) {
        return;
      }
      observeVerifiedSession(result.data, result.dataUpdatedAt);
    };
    const observeSession = (result: QueryObserverResult<OfflineAuthData>) => {
      if (!active || lifetime !== startedLifetime) {
        return;
      }
      // A retry retains its previous error until the new request settles.
      if (result.isError && result.isFetching) {
        return;
      }
      applySessionResult(result);
    };
    // Apply authorization immediately; only React subscriber notifications are scheduled.
    const unsubscribeAuth = observer.subscribe(observeSession);
    observeSession(observer.getCurrentResult());
    const unsubscribeCache = client.getQueryCache().subscribe((event) => {
      const account = snapshot.account;
      if (
        !account ||
        !snapshot.canMutate ||
        event.query.queryKey[0] !== "applications" ||
        event.query.queryKey[1] !== account.userId ||
        event.type !== "updated" ||
        !["success", "error"].includes(event.action.type)
      ) {
        return;
      }
      clearTimeout(persistTimer);
      persistTimer = setTimeout(() => {
        void persist(account);
      }, 100);
    });
    const lost = () => dispatch({ type: "CONNECTION_LOST" }, "immediate");
    const unavailable = () => dispatch({ type: "SERVER_UNAVAILABLE" }, "immediate");
    const retry = () => {
      void retryConnection();
    };
    const expired = () => {
      void signOutLocally().catch(() => {});
    };
    window.addEventListener("offline", lost);
    window.addEventListener("online", retry);
    window.addEventListener("xeniway:retry-connection", retry);
    window.addEventListener("xeniway:server-unavailable", unavailable);
    window.addEventListener("xeniway:auth-expired", expired);
    setAuthenticatedRequestGuard(assertWrite);
    synchronizeDownloadResources();
    const restorationEpoch = state.epoch;
    void options.restoration?.then((restored) => {
      if (!active || lifetime !== startedLifetime) {
        return;
      }
      restoreAccount(restored, restorationEpoch);
    });
    return () => {
      active = false;
      lifetime += 1;
      if (state.connection.status === "verifying") {
        dispatch({ type: "VERIFY_FAILED", operation: state.connection.operation, online: navigator.onLine });
      }
      if (state.download.status === "preparing") {
        dispatch({ type: "PREPARATION_CANCELLED", operation: state.download.operation });
      }
      unsubscribeAuth();
      unsubscribeCache();
      window.removeEventListener("offline", lost);
      window.removeEventListener("online", retry);
      window.removeEventListener("xeniway:retry-connection", retry);
      window.removeEventListener("xeniway:server-unavailable", unavailable);
      window.removeEventListener("xeniway:auth-expired", expired);
      channel?.close();
      channel = null;
      clearTimeout(expiryTimer);
      clearTimeout(persistTimer);
      stopWorkerUpdates?.();
      watchedAccount = null;
      persistenceEnabled = false;
      setAuthenticatedRequestGuard(null);
    };
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start,
    retryConnection,
    removeDownload,
    signOutLocally,
    prepareDownload,
    confirmSignIn: (userId: number) => {
      if (active && authUser()?.id === userId) {
        dispatch({ type: "SIGN_IN_SUCCEEDED", userId, online: navigator.onLine });
      }
    },
    reportLocalLogout,
    clearLocalLogout,
  };
}
