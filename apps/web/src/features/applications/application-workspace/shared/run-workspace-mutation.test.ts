import { expect, test, vi } from "vitest";
import { runWorkspaceMutation } from "./run-workspace-mutation";

test("workspace mutation status reports success and failure without leaking errors", async () => {
  const successStatus = vi.fn();
  expect(await runWorkspaceMutation(async () => {}, successStatus, "saved", "saveFailed")).toBe(true);
  expect(successStatus).toHaveBeenNthCalledWith(1, null);
  expect(successStatus).toHaveBeenNthCalledWith(2, "saved");

  const failureStatus = vi.fn();
  expect(
    await runWorkspaceMutation(
      async () => {
        throw new Error("request failed");
      },
      failureStatus,
      "saved",
      "saveFailed",
    ),
  ).toBe(false);
  expect(failureStatus).toHaveBeenNthCalledWith(1, null);
  expect(failureStatus).toHaveBeenNthCalledWith(2, "saveFailed");
});
