const offlineLogoutNoticeKey = "xeniway.offline-logout-notice";

export function readOfflineLogoutNotice() {
  try {
    return { pending: window.sessionStorage.getItem(offlineLogoutNoticeKey) === "true", storageFailed: false };
  } catch {
    return { pending: false, storageFailed: true };
  }
}

export function hasOfflineLogoutNotice(): boolean {
  return readOfflineLogoutNotice().pending;
}

export function saveOfflineLogoutNotice() {
  try {
    window.sessionStorage.setItem(offlineLogoutNoticeKey, "true");
    return true;
  } catch {
    return false;
  }
}

export function clearOfflineLogoutNotice() {
  try {
    window.sessionStorage.removeItem(offlineLogoutNoticeKey);
    return true;
  } catch {
    return false;
  }
}
