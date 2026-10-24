import { isCancelledError } from "@tanstack/react-query";
import { OfflineCleanupPendingError } from "./offline-cleanup";
import { OfflinePreparationChangedError } from "./offline-store";

export type OfflinePreparationCategory = "resources" | "connection" | "storage";

export class OfflinePreparationFailure extends Error {
  constructor(public readonly category: OfflinePreparationCategory) {
    super("Offline preparation could not be completed");
    this.name = "OfflinePreparationFailure";
  }
}

export function isPreparationCancelled(error: unknown) {
  return (
    error instanceof OfflinePreparationChangedError ||
    error instanceof OfflineCleanupPendingError ||
    isCancelledError(error) ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

export async function preparationStage<T>(
  category: OfflinePreparationCategory,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isPreparationCancelled(error) || error instanceof OfflinePreparationFailure) {
      throw error;
    }
    throw new OfflinePreparationFailure(category);
  }
}
