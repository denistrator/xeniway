import type { AccessState } from "./offline-access-machine";

export function connectionMessageKey(status: AccessState["verification"]["status"]) {
  switch (status) {
    case "checking":
      return "offline.checkingConnection";
    case "succeeded":
      return "offline.connectionConfirmed";
    case "failed":
      return "offline.connectionFailed";
    case "idle":
      return null;
  }
}
