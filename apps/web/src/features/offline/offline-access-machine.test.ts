import { expect, test } from "vitest";
import { createAccessState, selectAccess, transitionAccess } from "./offline-access-machine";
import { OFFLINE_RETENTION_MS } from "./offline-types";

const now = 1000;
const account = {
  version: 1 as const,
  userId: 1,
  email: "candidate@example.com",
  verifiedAt: now,
  expiresAt: now + OFFLINE_RETENTION_MS,
  ready: true,
  buildId: "build",
  preparationId: "generation",
};
const verified = () => createAccessState({ online: true, userId: 1 });

test.each(["CONNECTION_LOST", "SERVER_UNAVAILABLE"] as const)("%s exposes a disconnected indicator", (type) => {
  const state = transitionAccess(verified(), { type });
  expect(selectAccess(state, now)).toMatchObject({ isDisconnected: true, canMutate: false });
  const checking = transitionAccess(state, { type: "VERIFY_STARTED", operation: 1 });
  const recovered = transitionAccess(checking, { type: "VERIFY_SUCCEEDED", operation: 1, userId: 1 });
  expect(selectAccess(recovered, now).isDisconnected).toBe(false);
});

test("connection loss immediately preserves verified memory reads without granting writes", () => {
  const state = transitionAccess(verified(), { type: "CONNECTION_LOST" });
  expect(selectAccess(state, now)).toMatchObject({ readAccountId: 1, canMutate: false, canReadRemote: false });
});
test("explicit removal does not revoke online authentication but revokes later memory fallback", () => {
  const removed = transitionAccess(verified(), { type: "DOWNLOAD_REMOVED" });
  expect(selectAccess(removed, now).canMutate).toBe(true);
  expect(selectAccess(transitionAccess(removed, { type: "CONNECTION_LOST" }), now).readAccountId).toBeNull();
});
test("only the current verification can reopen remote access", () => {
  let state = transitionAccess(verified(), { type: "VERIFY_STARTED", operation: 1 });
  state = transitionAccess(state, { type: "VERIFY_STARTED", operation: 2 });
  expect(transitionAccess(state, { type: "VERIFY_SUCCEEDED", operation: 1, userId: 1 })).toBe(state);
  state = transitionAccess(state, { type: "VERIFY_SUCCEEDED", operation: 2, userId: 1 });
  expect(selectAccess(state, now).canMutate).toBe(true);
});
test.each(["SIGNED_OUT", "SESSION_REJECTED"] as const)("%s invalidates pending private work", (type) => {
  const pending = transitionAccess(verified(), {
    type: "PREPARATION_STARTED",
    operation: 4,
    userId: 1,
    refresh: false,
  });
  const revoked = transitionAccess(pending, { type });
  expect(selectAccess(revoked, now).readAccountId).toBeNull();
  expect(transitionAccess(revoked, { type: "PREPARATION_SUCCEEDED", operation: 4, account })).toBe(revoked);
});
test("download replacement supersedes old progress without signing out the verified owner", () => {
  const pending = transitionAccess(verified(), { type: "PREPARATION_STARTED", operation: 4, userId: 1, refresh: true });
  const replaced = transitionAccess(pending, { type: "DOWNLOAD_REPLACED" });
  expect(selectAccess(replaced, now).canMutate).toBe(true);
  expect(
    transitionAccess(replaced, { type: "PREPARATION_PROGRESS", operation: 4, progress: { completed: 1, total: 2 } }),
  ).toBe(replaced);
});
test("a restoration predating logout cannot restore private access", () => {
  const state = createAccessState({ online: false, restoring: true });
  const revoked = transitionAccess(state, { type: "SIGNED_OUT" });
  expect(transitionAccess(revoked, { type: "RESTORED", epoch: state.epoch, account })).toBe(revoked);
});
test("expired device data never grants read access", () => {
  const state = createAccessState({ online: false, account });
  expect(selectAccess(state, account.expiresAt).readAccountId).toBeNull();
});
test("verification of a different owner discards restored device access", () => {
  const state = createAccessState({ online: true, account });
  const switched = transitionAccess(state, { type: "SESSION_VERIFIED", userId: 2 });
  expect(selectAccess(switched, now).account).toBeNull();
  expect(selectAccess(transitionAccess(switched, { type: "CONNECTION_LOST" }), now).readAccountId).toBe(2);
});
test("an auth cache update while disconnected cannot establish memory access for a new owner", () => {
  const state = createAccessState({ online: false });
  const observed = transitionAccess(state, { type: "SESSION_VERIFIED", userId: 2 });
  expect(selectAccess(observed, now).readAccountId).toBeNull();
});
test("session observation does not recover an unavailable connection", () => {
  const unavailable = transitionAccess(verified(), { type: "SERVER_UNAVAILABLE" });
  const observed = transitionAccess(unavailable, { type: "SESSION_VERIFIED", userId: 1 });
  expect(selectAccess(observed, now).canMutate).toBe(false);
});
test("a transient session failure preserves local reads but disables remote access", () => {
  const unavailable = transitionAccess(verified(), { type: "SESSION_UNAVAILABLE" });
  expect(selectAccess(unavailable, now)).toMatchObject({ readAccountId: 1, canMutate: false, canReadRemote: false });
});
