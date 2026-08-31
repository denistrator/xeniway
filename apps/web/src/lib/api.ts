import type { ApiError } from "@hello/shared";

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const payload = (await response.json()) as T | ApiError;

  if (!response.ok) {
    const error = payload as ApiError;
    throw new Error(error.error?.message ?? "The request failed");
  }

  return payload as T;
}
