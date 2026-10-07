import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { afterEach, expect, test, vi } from "vitest";
import { userPreferencesKeys } from "../../lib/api";
import { authKeys } from "../../lib/queries";
import { store } from "../../store";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import { UserPreferencesSync } from "./user-preferences-sync.tsx";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("account preference observers do not synchronously update subscribers during render", async () => {
  await initializeTestI18n();
  const preferences = {
    selectedLanguage: null,
    selectedTheme: null,
    selectedFormPresentation: null,
    wasIntroduced: false,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ data: { preferences } }))),
  );
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "one@example.com" } } });
  client.setQueryData(userPreferencesKeys.current(1), { data: { preferences } });
  const view = render(
    <StrictMode>
      <Provider store={store}>
        <QueryClientProvider client={client}>
          <UserPreferencesSync />
          <UserPreferencesSync />
        </QueryClientProvider>
      </Provider>
    </StrictMode>,
  );
  await act(async () => {
    client.setQueryData(authKeys.me, { data: { user: { id: 2, email: "two@example.com" } } });
  });
  await waitFor(() => expect(client.getQueryData(userPreferencesKeys.current(2))).toEqual({ data: { preferences } }));
  expect(errors.mock.calls.filter(([message]) => String(message).includes("Cannot update a component"))).toEqual([]);
  view.unmount();
  client.clear();
});
