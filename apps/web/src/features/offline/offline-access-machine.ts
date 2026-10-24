import type { OfflineAccountMetadata, OfflinePreparationProgress } from "./offline-types";

type Connection = { status: "online" | "offline" | "unavailable" } | { status: "verifying"; operation: number };
type Session = { status: "checking" | "unavailable" | "signed-out" } | { status: "verified"; userId: number };
export type DeviceDownload =
  | { status: "absent" | "restoring" | "failed" | "restore-failed" | "restore-timed-out" }
  | { status: "ready"; account: OfflineAccountMetadata }
  | {
      status: "preparing";
      operation: number;
      userId: number;
      refresh: boolean;
      progress: OfflinePreparationProgress | null;
    };

export type DownloadCleanup =
  | { status: "idle" | "unavailable" }
  | { status: "removing" | "failed"; ownerId: number; preparationId: string | null };

export type AccessState = {
  connection: Connection;
  session: Session;
  download: DeviceDownload;
  cleanup: DownloadCleanup;
  memoryOwner: number | null;
  epoch: number;
  storageError: boolean;
  localLogout: boolean;
  logoutNoticeStorageFailed: boolean;
  logoutFinish: "idle" | "pending" | "failed";
  updateAvailable: boolean;
};

export type AccessEvent =
  | {
      type:
        | "CONNECTION_LOST"
        | "SERVER_UNAVAILABLE"
        | "SESSION_UNAVAILABLE"
        | "RESTORATION_CANCELLED"
        | "SIGNED_OUT"
        | "SESSION_REJECTED"
        | "DOWNLOAD_REMOVED"
        | "DOWNLOAD_REPLACED"
        | "STORAGE_FAILED"
        | "WORKER_UPDATE_AVAILABLE";
    }
  | { type: "LOCAL_LOGOUT_REPORTED"; localLogout: boolean; storageFailed?: boolean }
  | { type: "LOGOUT_FINISH_CHANGED"; status: AccessState["logoutFinish"] }
  | { type: "SESSION_VERIFIED"; userId: number }
  | { type: "SIGN_IN_SUCCEEDED"; userId: number; online: boolean }
  | { type: "VERIFY_STARTED"; operation: number }
  | { type: "VERIFY_SUCCEEDED"; operation: number; userId: number }
  | { type: "VERIFY_FAILED"; operation: number; online: boolean }
  | { type: "RESTORED"; epoch: number; account: OfflineAccountMetadata | null }
  | { type: "RESTORATION_STARTED" }
  | { type: "RESTORATION_FAILED"; epoch: number; timedOut: boolean }
  | { type: "DOWNLOAD_EXPIRED"; account: OfflineAccountMetadata }
  | { type: "DOWNLOAD_REMOVAL_STARTED"; ownerId: number; preparationId: string | null }
  | { type: "DOWNLOAD_CLEANUP_DISCOVERED"; ownerId: number; preparationId: string | null }
  | { type: "DOWNLOAD_CLEANUP_UNAVAILABLE" | "DOWNLOAD_CLEANUP_CHECKED" }
  | { type: "DOWNLOAD_CLEANUP_SUCCEEDED" | "DOWNLOAD_CLEANUP_FAILED"; ownerId: number; preparationId: string | null }
  | { type: "PREPARATION_STARTED"; operation: number; userId: number; refresh: boolean }
  | { type: "PREPARATION_PROGRESS"; operation: number; progress: OfflinePreparationProgress }
  | { type: "PREPARATION_SUCCEEDED"; operation: number; account: OfflineAccountMetadata }
  | { type: "PREPARATION_FAILED" | "PREPARATION_CANCELLED"; operation: number };

export function createAccessState(input: {
  online: boolean;
  userId?: number;
  account?: OfflineAccountMetadata | null;
  restoring?: boolean;
  localLogout?: boolean;
  logoutNoticeStorageFailed?: boolean;
}): AccessState {
  const state: AccessState = {
    connection: { status: input.online ? "online" : "offline" },
    session: input.userId ? { status: "verified", userId: input.userId } : { status: "checking" },
    download: input.account
      ? { status: "ready", account: input.account }
      : { status: input.restoring ? "restoring" : "absent" },
    cleanup: { status: "idle" },
    memoryOwner: input.userId ?? null,
    epoch: 0,
    storageError: false,
    localLogout: input.localLogout ?? false,
    logoutNoticeStorageFailed: input.logoutNoticeStorageFailed ?? false,
    logoutFinish: "idle",
    updateAvailable: false,
  };
  return input.localLogout ? signedOut(state) : state;
}

function verifiedSession(state: AccessState, userId: number): AccessState {
  if (state.localLogout) {
    return state;
  }
  const switched = state.session.status === "verified" && state.session.userId !== userId;
  let downloadOwner: number | null = null;
  switch (state.download.status) {
    case "ready":
      downloadOwner = state.download.account.userId;
      break;
    case "preparing":
      downloadOwner = state.download.userId;
      break;
  }
  let memoryOwner: number | null = userId;
  if (state.connection.status === "offline" && state.memoryOwner !== userId) {
    memoryOwner = null;
  }
  const wrongDownload = downloadOwner !== null && downloadOwner !== userId;
  return {
    ...state,
    session: { status: "verified", userId },
    memoryOwner,
    download: switched || wrongDownload ? { status: "absent" } : state.download,
    epoch: switched || wrongDownload ? state.epoch + 1 : state.epoch,
  };
}

function finishVerification(
  state: AccessState,
  event: Extract<AccessEvent, { type: "VERIFY_SUCCEEDED" | "VERIFY_FAILED" }>,
): AccessState {
  if (state.connection.status !== "verifying" || state.connection.operation !== event.operation) {
    return state;
  }
  if (event.type === "VERIFY_SUCCEEDED") {
    return { ...verifiedSession(state, event.userId), connection: { status: "online" } };
  }
  return { ...state, connection: { status: event.online ? "unavailable" : "offline" } };
}

function restoreDownload(state: AccessState, event: Extract<AccessEvent, { type: "RESTORED" }>): AccessState {
  if (event.epoch !== state.epoch || state.session.status === "signed-out" || state.cleanup.status !== "idle") {
    return state;
  }
  return { ...state, download: event.account ? { status: "ready", account: event.account } : { status: "absent" } };
}

function failRestoration(state: AccessState, event: Extract<AccessEvent, { type: "RESTORATION_FAILED" }>): AccessState {
  if (event.epoch !== state.epoch || state.download.status !== "restoring") {
    return state;
  }
  return { ...state, download: { status: event.timedOut ? "restore-timed-out" : "restore-failed" } };
}

function updatePreparation(
  state: AccessState,
  event: Extract<
    AccessEvent,
    { type: "PREPARATION_PROGRESS" | "PREPARATION_SUCCEEDED" | "PREPARATION_FAILED" | "PREPARATION_CANCELLED" }
  >,
): AccessState {
  if (state.download.status !== "preparing" || state.download.operation !== event.operation) {
    return state;
  }
  switch (event.type) {
    case "PREPARATION_CANCELLED":
      return { ...state, download: { status: "absent" } };
    case "PREPARATION_PROGRESS":
      return { ...state, download: { ...state.download, progress: event.progress } };
    case "PREPARATION_SUCCEEDED":
      return { ...state, download: { status: "ready", account: event.account } };
    case "PREPARATION_FAILED":
      return { ...state, download: { status: "failed" } };
  }
}

function signedOut(state: AccessState): AccessState {
  return {
    ...state,
    session: { status: "signed-out" },
    connection: state.connection.status === "offline" ? state.connection : { status: "online" },
    download: { status: "absent" },
    memoryOwner: null,
    epoch: state.epoch + 1,
  };
}

function expireDownload(state: AccessState, account: OfflineAccountMetadata): AccessState {
  if (state.download.status !== "ready" || state.download.account !== account) {
    return state;
  }
  return { ...state, download: { status: "absent" }, epoch: state.epoch + 1 };
}

function updateLocalLogout(
  state: AccessState,
  event: Extract<AccessEvent, { type: "LOCAL_LOGOUT_REPORTED" }>,
): AccessState {
  const storageFailed = event.storageFailed ?? false;
  if (
    state.localLogout === event.localLogout &&
    state.logoutNoticeStorageFailed === storageFailed &&
    state.logoutFinish === "idle"
  ) {
    return state;
  }
  return { ...state, localLogout: event.localLogout, logoutNoticeStorageFailed: storageFailed, logoutFinish: "idle" };
}

function startDownloadCleanup(state: AccessState, ownerId: number, preparationId: string | null): AccessState {
  return {
    ...state,
    download: { status: "absent" },
    cleanup: {
      status: "removing",
      ownerId,
      preparationId,
    },
    memoryOwner: null,
    epoch: state.epoch + 1,
  };
}

function finishDownloadCleanup(
  state: AccessState,
  event: Extract<AccessEvent, { type: "DOWNLOAD_CLEANUP_SUCCEEDED" | "DOWNLOAD_CLEANUP_FAILED" }>,
): AccessState {
  if (state.cleanup.status !== "removing" && state.cleanup.status !== "failed") {
    return state;
  }
  if (state.cleanup.ownerId !== event.ownerId || state.cleanup.preparationId !== event.preparationId) {
    return state;
  }
  if (event.type === "DOWNLOAD_CLEANUP_SUCCEEDED") {
    return { ...state, cleanup: { status: "idle" } };
  }
  return { ...state, cleanup: { ...state.cleanup, status: "failed" } };
}

function unavailableDownloadCleanup(state: AccessState): AccessState {
  if (state.cleanup.status !== "idle") {
    return state.storageError ? state : { ...state, storageError: true };
  }
  return {
    ...state,
    download: { status: "absent" },
    memoryOwner: null,
    cleanup: { status: "unavailable" },
    storageError: true,
    epoch: state.epoch + 1,
  };
}

/** The sole policy entry point. Asynchronous operations stay in the runtime. */
export function transitionAccess(state: AccessState, event: AccessEvent): AccessState {
  switch (event.type) {
    case "CONNECTION_LOST":
      return { ...state, connection: { status: "offline" } };
    case "SERVER_UNAVAILABLE":
      return { ...state, connection: { status: "unavailable" } };
    case "SESSION_UNAVAILABLE":
      return {
        ...state,
        connection: state.connection.status === "offline" ? state.connection : { status: "unavailable" },
        session: state.session.status === "checking" ? { status: "unavailable" } : state.session,
      };
    case "RESTORATION_CANCELLED":
      return {
        ...state,
        epoch: state.epoch + 1,
        download: state.download.status === "restoring" ? { status: "absent" } : state.download,
      };
    case "SESSION_VERIFIED":
      return verifiedSession(state, event.userId);
    case "SIGN_IN_SUCCEEDED":
      return verifiedSession({ ...state, connection: { status: event.online ? "online" : "offline" } }, event.userId);
    case "VERIFY_STARTED":
      return { ...state, connection: { status: "verifying", operation: event.operation } };
    case "VERIFY_SUCCEEDED":
    case "VERIFY_FAILED":
      return finishVerification(state, event);
    case "SIGNED_OUT":
    case "SESSION_REJECTED":
      return signedOut(state);
    case "DOWNLOAD_REMOVAL_STARTED":
      return startDownloadCleanup(state, event.ownerId, event.preparationId);
    case "DOWNLOAD_CLEANUP_DISCOVERED": {
      const removed = startDownloadCleanup(state, event.ownerId, event.preparationId);
      return { ...removed, cleanup: { status: "failed", ownerId: event.ownerId, preparationId: event.preparationId } };
    }
    case "DOWNLOAD_CLEANUP_UNAVAILABLE":
      return unavailableDownloadCleanup(state);
    case "DOWNLOAD_CLEANUP_CHECKED":
      return state.cleanup.status === "unavailable"
        ? { ...state, cleanup: { status: "idle" }, storageError: false }
        : state;
    case "DOWNLOAD_CLEANUP_SUCCEEDED":
    case "DOWNLOAD_CLEANUP_FAILED":
      return finishDownloadCleanup(state, event);
    case "DOWNLOAD_REMOVED":
      return { ...state, download: { status: "absent" }, memoryOwner: null, epoch: state.epoch + 1 };
    case "DOWNLOAD_REPLACED":
      return { ...state, download: { status: "absent" }, epoch: state.epoch + 1 };
    case "RESTORED":
      return restoreDownload(state, event);
    case "RESTORATION_STARTED":
      return { ...state, download: { status: "restoring" }, epoch: state.epoch + 1 };
    case "RESTORATION_FAILED":
      return failRestoration(state, event);
    case "DOWNLOAD_EXPIRED":
      return expireDownload(state, event.account);
    case "PREPARATION_STARTED":
      return {
        ...state,
        download: {
          status: "preparing",
          operation: event.operation,
          userId: event.userId,
          refresh: event.refresh,
          progress: null,
        },
        epoch: state.epoch + 1,
      };
    case "PREPARATION_PROGRESS":
    case "PREPARATION_SUCCEEDED":
    case "PREPARATION_FAILED":
    case "PREPARATION_CANCELLED":
      return updatePreparation(state, event);
    case "STORAGE_FAILED":
      return state.storageError ? state : { ...state, storageError: true };
    case "LOCAL_LOGOUT_REPORTED":
      return updateLocalLogout(state, event);
    case "LOGOUT_FINISH_CHANGED":
      return { ...state, logoutFinish: event.status };
    case "WORKER_UPDATE_AVAILABLE":
      return state.updateAvailable ? state : { ...state, updateAvailable: true };
  }
}

export function selectAccess(state: AccessState, now: number) {
  const account =
    state.download.status === "ready" && state.download.account.expiresAt > now ? state.download.account : null;
  const canMutate = state.connection.status === "online" && state.session.status === "verified";
  const verifiedOwner = state.session.status === "verified" ? state.session.userId : null;
  const awaitingAccess =
    state.session.status === "checking" ||
    state.connection.status === "verifying" ||
    state.download.status === "restoring";
  return {
    account,
    isDisconnected: state.connection.status !== "online",
    readAccountId: canMutate ? verifiedOwner : (account?.userId ?? state.memoryOwner),
    canMutate,
    canReadRemote: canMutate,
    checking: !account && awaitingAccess,
    download: state.download,
    cleanup: state.cleanup,
    storageError: state.storageError,
    localLogout: state.localLogout,
    logoutNoticeStorageFailed: state.logoutNoticeStorageFailed,
    logoutFinish: state.logoutFinish,
    updateAvailable: state.updateAvailable,
  };
}
