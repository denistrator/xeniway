import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { authKeys, useCurrentUser } from "./queries";

const user = { id: 1, email: "candidate@example.com" };

function setup(status = 200) {
  const payload = status === 200 ? { data: { user } } : { error: { code: "UNAUTHORIZED", message: "Unauthorized" } };
  const fetchRequest = vi.fn(async () => new Response(JSON.stringify(payload), { status }));
  vi.stubGlobal("fetch", fetchRequest);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </StrictMode>
  );
  return { queryClient, wrapper, fetchRequest };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  focusManager.setFocused(undefined);
});

test.each([200, 401, 500])(
  "shares the initial auth response (%s) with consumers mounted after it settles",
  async (status) => {
    const { wrapper, fetchRequest } = setup(status);
    const header = renderHook(() => useCurrentUser(), { wrapper });
    await waitFor(() => expect(header.result.current.isFetching).toBe(false));
    expect(fetchRequest).toHaveBeenCalledTimes(1);

    const lateConsumer = renderHook(() => useCurrentUser(), { wrapper });
    await act(async () => {});

    expect(fetchRequest).toHaveBeenCalledTimes(1);
    expect(lateConsumer.result.current.data).toEqual(status === 200 ? user : undefined);
    expect(lateConsumer.result.current.isError).toBe(status !== 200);
  },
);

test("still revalidates an explicitly invalidated current user", async () => {
  const { queryClient, wrapper, fetchRequest } = setup();
  const { result } = renderHook(() => useCurrentUser(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  await act(() => queryClient.invalidateQueries({ queryKey: authKeys.me }));

  expect(fetchRequest).toHaveBeenCalledTimes(2);
});

test("revalidates on focus once the successful auth response is stale", async () => {
  const { wrapper, fetchRequest } = setup();
  const { result } = renderHook(() => useCurrentUser(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now + 60_001);
  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });

  await waitFor(() => expect(fetchRequest).toHaveBeenCalledTimes(2));
});

test("can recover from an unsuccessful session check on focus", async () => {
  const { wrapper, fetchRequest } = setup(401);
  const { result } = renderHook(() => useCurrentUser(), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  fetchRequest.mockImplementation(async () => new Response(JSON.stringify({ data: { user } })));

  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });

  await waitFor(() => expect(result.current.data).toEqual(user));
  expect(fetchRequest).toHaveBeenCalledTimes(2);
});
