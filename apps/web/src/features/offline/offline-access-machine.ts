import type { OfflineAccountMetadata, OfflinePreparationProgress } from "./offline-types";

type Connection = { status: "online" | "offline" | "unavailable" } | { status: "verifying"; operation: number };
type Session = { status: "checking" | "unavailable" | "signed-out" } | { status: "verified"; userId: number };
export type DeviceDownload =
  | { status: "absent" | "restoring" | "failed" }
  | { status: "ready"; account: OfflineAccountMetadata }
  | {
      status: "preparing";
      operation: number;
      userId: number;
      refresh: boolean;
      progress: OfflinePreparationProgress | null;
    };

export type AccessState = {
  connection: Connection;
  session: Session;
  download: DeviceDownload;
  memoryOwner: number | null;
  epoch: number;
  storageError: boolean;
  localLogout: boolean;
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
  | { type: "LOCAL_LOGOUT_REPORTED"; localLogout: boolean }
  | { type: "SESSION_VERIFIED"; userId: number }
  | { type: "SIGN_IN_SUCCEEDED"; userId: number; online: boolean }
  | { type: "VERIFY_STARTED"; operation: number }
  | { type: "VERIFY_SUCCEEDED"; operation: number; userId: number }
  | { type: "VERIFY_FAILED"; operation: number; online: boolean }
  | { type: "RESTORED"; epoch: number; account: OfflineAccountMetadata | null }
  | { type: "DOWNLOAD_EXPIRED"; account: OfflineAccountMetadata }
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
}): AccessState {
  return {
    connection: { status: input.online ? "online" : "offline" },
    session: input.userId ? { status: "verified", userId: input.userId } : { status: "checking" },
    download: input.account
      ? { status: "ready", account: input.account }
      : { status: input.restoring ? "restoring" : "absent" },
    memoryOwner: input.userId ?? null,
    epoch: 0,
    storageError: false,
    localLogout: input.localLogout ?? false,
    updateAvailable: false,
  };
}

function verifiedSession(state: AccessState, userId: number): AccessState {
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
  if (event.epoch !== state.epoch || state.session.status === "signed-out") {
    return state;
  }
  return { ...state, download: event.account ? { status: "ready", account: event.account } : { status: "absent" } };
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

function updateLocalLogout(state: AccessState, localLogout: boolean): AccessState {
  if (state.localLogout === localLogout) {
    return state;
  }
  return { ...state, localLogout };
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
    case "DOWNLOAD_REMOVED":
      return { ...state, download: { status: "absent" }, memoryOwner: null, epoch: state.epoch + 1 };
    case "DOWNLOAD_REPLACED":
      return { ...state, download: { status: "absent" }, epoch: state.epoch + 1 };
    case "RESTORED":
      return restoreDownload(state, event);
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
      return updateLocalLogout(state, event.localLogout);
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
    storageError: state.storageError,
    localLogout: state.localLogout,
    updateAvailable: state.updateAvailable,
  };
}
