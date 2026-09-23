import type { User } from "@xeniway/shared";
import type { AuthService } from "../../services/auth";
import { readSessionId } from "./cookies";
import type { ResponseSet } from "./responses";

export type AuthContext = { sessionId: string; userId: number; user: User };
export const CSRF_HEADER = "x-csrf-token";

export async function requireAuth(auth: AuthService, set: ResponseSet, request: Request): Promise<AuthContext | null> {
  const sessionId = await readSessionId(set, request);
  const user = await auth.getCurrentUser(sessionId);
  return user && sessionId ? { sessionId, userId: user.id, user } : null;
}

export async function verifyRequestCsrf(auth: AuthService, set: ResponseSet, request: Request): Promise<boolean> {
  return auth.verifyCsrf(await readSessionId(set, request), request.headers.get(CSRF_HEADER) ?? undefined);
}
