const offlineLogoutNoticeKey = "xeniway.offline-logout-notice";

function getSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function hasOfflineLogoutNotice(): boolean {
  return getSessionStorage()?.getItem(offlineLogoutNoticeKey) === "true";
}

export function saveOfflineLogoutNotice() {
  getSessionStorage()?.setItem(offlineLogoutNoticeKey, "true");
}

export function clearOfflineLogoutNotice() {
  getSessionStorage()?.removeItem(offlineLogoutNoticeKey);
}
