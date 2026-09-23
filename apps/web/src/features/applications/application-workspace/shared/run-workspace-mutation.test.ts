import { describe, expect, it, vi } from "vitest";
import { runWorkspaceMutation } from "./run-workspace-mutation";

describe("runWorkspaceMutation", () => {
  it("clears the previous status and reports success", async () => {
    const setStatus = vi.fn();

    const succeeded = await runWorkspaceMutation(async () => {}, setStatus, "saved", "saveFailed");

    expect(succeeded).toBe(true);
    expect(setStatus).toHaveBeenNthCalledWith(1, null);
    expect(setStatus).toHaveBeenNthCalledWith(2, "saved");
  });

  it("reports failure without rethrowing the mutation error", async () => {
    const setStatus = vi.fn();

    const succeeded = await runWorkspaceMutation(
      async () => {
        throw new Error("request failed");
      },
      setStatus,
      "saved",
      "saveFailed",
    );

    expect(succeeded).toBe(false);
    expect(setStatus).toHaveBeenNthCalledWith(1, null);
    expect(setStatus).toHaveBeenNthCalledWith(2, "saveFailed");
  });
});
