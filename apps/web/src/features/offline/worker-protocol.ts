export type WorkerRequest =
  | { type: "GET_BUILD_ID"; requestId: string }
  | { type: "PREPARE_ASSETS"; requestId: string; buildId: string | null; claimClients: boolean };

export type WorkerReply =
  | { type: "BUILD_ID" | "ASSETS_READY"; requestId: string; buildId: string }
  | { type: "ASSETS_FAILED"; requestId: string; buildId: string; message: string };

/** Invalid preparation identities still receive a correlated build-mismatch reply. */
export function parseWorkerRequest(message: unknown): WorkerRequest | null {
  if (
    !message ||
    typeof message !== "object" ||
    !("requestId" in message) ||
    typeof message.requestId !== "string" ||
    !("type" in message)
  )
    return null;
  const requestId = message.requestId;
  if (message.type === "GET_BUILD_ID") return { type: message.type, requestId };
  if (message.type === "PREPARE_ASSETS")
    return {
      type: message.type,
      requestId,
      buildId: "buildId" in message && typeof message.buildId === "string" ? message.buildId : null,
      claimClients: "claimClients" in message && message.claimClients === true,
    };
  return null;
}

/** Identity is checked before response kind, including failure responses. */
export function parseWorkerReply(message: unknown, request: WorkerRequest): WorkerReply {
  if (
    !message ||
    typeof message !== "object" ||
    !("requestId" in message) ||
    message.requestId !== request.requestId ||
    !("buildId" in message) ||
    typeof message.buildId !== "string" ||
    !message.buildId ||
    (request.type === "PREPARE_ASSETS" && request.buildId && message.buildId !== request.buildId)
  ) {
    throw new Error("Offline worker response identity mismatch");
  }
  const identity = { requestId: request.requestId, buildId: message.buildId };
  if ("type" in message) {
    const expectedType = request.type === "GET_BUILD_ID" ? "BUILD_ID" : "ASSETS_READY";
    if (message.type === expectedType) return { type: expectedType, ...identity };
    if (message.type === "ASSETS_FAILED")
      return {
        type: "ASSETS_FAILED",
        ...identity,
        message:
          "message" in message && typeof message.message === "string" ? message.message : "Offline assets failed",
      };
  }
  throw new Error("Unexpected offline worker response");
}
