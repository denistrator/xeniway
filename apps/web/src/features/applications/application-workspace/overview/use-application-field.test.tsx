import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { authKeys } from "../../../../lib/queries";
import { useApplicationField } from "./use-application-field";

test("application field save validates and sends only the edited field", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: { application: { id: 7, location: "Remote" } } }), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useApplicationField(7, "location", "Old location"), { wrapper });

  act(() => result.current.beginEdit());
  act(() => result.current.setDraft("  Remote  "));
  await act(async () => result.current.save());

  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ location: "Remote" });
  expect(result.current.editing).toBe(false);
  vi.unstubAllGlobals();
});
