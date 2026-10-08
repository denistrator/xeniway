import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { Provider } from "react-redux";
import { beforeEach, expect, test } from "vitest";
import { useApp } from "./App.model";
import { applicationKeys, userPreferencesKeys } from "./lib/api";
import { authKeys } from "./lib/queries";
import { userPreferencesStorageKey } from "./lib/user-preferences";
import { store } from "./store";
import { initializeTestI18n } from "./test/initialize-test-i18n";

function renderAppModel(queryClient: QueryClient) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <StrictMode>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </Provider>
      </StrictMode>
    );
  }
  return renderHook(useApp, { wrapper });
}

test("clears account query caches on auth expiry without clearing local preferences", async () => {
  const queryClient = new QueryClient();
  const localPreferences = JSON.stringify({ theme: "light", language: "ru", wasIntroduced: false });
  window.localStorage.setItem(userPreferencesStorageKey, localPreferences);
  queryClient.setQueryData(authKeys.me, { data: { user: { id: 1, email: "a@example.com" } } });
  queryClient.setQueryData(authKeys.csrf, { data: { csrfToken: "test-token" } });
  queryClient.setQueryData(applicationKeys.list(1, "active"), { data: { applications: [] } });
  queryClient.setQueryData(userPreferencesKeys.current(1), { data: { preferences: { selectedTheme: "dark" } } });
  queryClient.setQueryData(userPreferencesKeys.current(2), { data: { preferences: { selectedTheme: "light" } } });

  renderAppModel(queryClient);
  const cachedPreferences = window.localStorage.getItem(userPreferencesStorageKey);
  window.dispatchEvent(new Event("xeniway:auth-expired"));

  await waitFor(() => {
    expect(queryClient.getQueryData(userPreferencesKeys.current(1))).toBeUndefined();
    expect(queryClient.getQueryData(userPreferencesKeys.current(2))).toBeUndefined();
  });
  expect(queryClient.getQueryData(applicationKeys.list(1, "active"))).toBeUndefined();
  expect(queryClient.getQueryData(authKeys.me)).toBeUndefined();
  expect(queryClient.getQueryData(authKeys.csrf)).toBeUndefined();
  expect(window.localStorage.getItem(userPreferencesStorageKey)).toBe(cachedPreferences);
});

test("removes the auth-expiry listener when the app model unmounts", () => {
  const queryClient = new QueryClient();
  const view = renderAppModel(queryClient);
  view.unmount();
  const account = { data: { user: { id: 1, email: "a@example.com" } } };
  queryClient.setQueryData(authKeys.me, account);

  window.dispatchEvent(new Event("xeniway:auth-expired"));

  expect(queryClient.getQueryData(authKeys.me)).toEqual(account);
  queryClient.clear();
});

beforeEach(async () => {
  window.localStorage.clear();
  await initializeTestI18n();
});
