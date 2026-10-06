import { describe, expect, it } from "vitest";
import { parseWorkerReply, parseWorkerRequest } from "./worker-protocol";

describe("worker request boundary", () => {
  it.each([null, [], {}, { type: "SKIP_WAITING", requestId: "request" }, { type: "GET_BUILD_ID", requestId: 1 }])(
    "ignores unsupported messages %j",
    (message) => expect(parseWorkerRequest(message)).toBeNull(),
  );
  it("projects only build discovery fields", () => {
    expect(parseWorkerRequest({ type: "GET_BUILD_ID", requestId: "request", claimClients: true })).toEqual({
      type: "GET_BUILD_ID",
      requestId: "request",
    });
  });
  it.each([undefined, 1, null])(
    "keeps invalid preparation builds available for a correlated failure (%j)",
    (buildId) => {
      expect(
        parseWorkerRequest({ type: "PREPARE_ASSETS", requestId: "request", buildId, claimClients: "true" }),
      ).toEqual({
        type: "PREPARE_ASSETS",
        requestId: "request",
        buildId: null,
        claimClients: false,
      });
    },
  );
  it("accepts explicit claiming only on preparation", () => {
    expect(
      parseWorkerRequest({ type: "PREPARE_ASSETS", requestId: "request", buildId: "build", claimClients: true }),
    ).toEqual({
      type: "PREPARE_ASSETS",
      requestId: "request",
      buildId: "build",
      claimClients: true,
    });
  });
});

describe("correlated worker reply boundary", () => {
  const request = { type: "PREPARE_ASSETS", requestId: "request", buildId: "build", claimClients: false } as const;
  it.each([
    null,
    {},
    { type: "ASSETS_READY", requestId: "other", buildId: "build" },
    { type: "ASSETS_READY", requestId: "request", buildId: "other" },
    { type: "ASSETS_READY", requestId: "request", buildId: "" },
  ])("rejects invalid identities %j", (reply) => {
    expect(() => parseWorkerReply(reply, request)).toThrow("Offline worker response identity mismatch");
  });
  it("rejects a correlated reply for the wrong operation", () => {
    expect(() => parseWorkerReply({ type: "BUILD_ID", requestId: "request", buildId: "build" }, request)).toThrow(
      "Unexpected offline worker response",
    );
  });
  it("accepts discovered build identity without a previously known build", () => {
    expect(
      parseWorkerReply(
        { type: "BUILD_ID", requestId: "request", buildId: "build" },
        { type: "GET_BUILD_ID", requestId: "request" },
      ),
    ).toEqual({ type: "BUILD_ID", requestId: "request", buildId: "build" });
  });
  it.each([undefined, 1, "", "Quota exhausted"])("normalizes failure detail %j", (message) => {
    expect(
      parseWorkerReply({ type: "ASSETS_FAILED", requestId: "request", buildId: "build", message }, request),
    ).toEqual({
      type: "ASSETS_FAILED",
      requestId: "request",
      buildId: "build",
      message: typeof message === "string" ? message : "Offline assets failed",
    });
  });
  it("accepts only the matching prepared build", () => {
    expect(parseWorkerReply({ type: "ASSETS_READY", requestId: "request", buildId: "build" }, request)).toEqual({
      type: "ASSETS_READY",
      requestId: "request",
      buildId: "build",
    });
  });
});
