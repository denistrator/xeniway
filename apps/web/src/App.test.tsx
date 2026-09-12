import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { AuthFailureHandler } from "./App";
import { applicationKeys, userPreferencesKeys } from "./lib/api";
import { authKeys } from "./lib/queries";
import { userPreferencesStorageKey } from "./lib/user-preferences";

test("clears account query caches on auth expiry without clearing local preferences", async () => {
  const queryClient = new QueryClient();
  const localPreferences = JSON.stringify({ theme: "light", language: "ru", wasIntroduced: false });
  window.localStorage.setItem(userPreferencesStorageKey, localPreferences);
  queryClient.setQueryData(authKeys.me, { data: { user: { id: 1, email: "a@example.com" } } });
  queryClient.setQueryData(applicationKeys.list("active"), { data: { applications: [] } });
  queryClient.setQueryData(userPreferencesKeys.current(1), { data: { preferences: { selectedTheme: "dark" } } });
  queryClient.setQueryData(userPreferencesKeys.current(2), { data: { preferences: { selectedTheme: "light" } } });

  render(
    <QueryClientProvider client={queryClient}>
      <AuthFailureHandler />
    </QueryClientProvider>,
  );
  window.dispatchEvent(new Event("xeniway:auth-expired"));

  await waitFor(() => {
    expect(queryClient.getQueryData(userPreferencesKeys.current(1))).toBeUndefined();
    expect(queryClient.getQueryData(userPreferencesKeys.current(2))).toBeUndefined();
  });
  expect(queryClient.getQueryData(applicationKeys.list("active"))).toBeUndefined();
  expect(queryClient.getQueryData(authKeys.me)).toBeUndefined();
  expect(window.localStorage.getItem(userPreferencesStorageKey)).toBe(localPreferences);
});

beforeEach(() => {
  window.localStorage.clear();
});
