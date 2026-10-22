import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { UserPreferences } from "@xeniway/shared";
import { type ReactNode, StrictMode } from "react";
import { Provider } from "react-redux";
import { beforeEach, expect, test, vi } from "vitest";
import { i18n } from "../../i18n/i18n";
import { useCurrentUser, useUpdateUserPreferences, useUserPreferences } from "../../lib/queries";
import { readLocalUserPreferences } from "../../lib/user-preferences";
import { setTheme, store } from "../../store";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import { useThemePreference } from "./theme-selector.model";
import { useUserPreferencesSync } from "./user-preferences-sync.model";

vi.mock("../../lib/queries", () => ({
  useCurrentUser: vi.fn(),
  useUserPreferences: vi.fn(),
  useUpdateUserPreferences: vi.fn(),
}));

const currentUser = { id: 1, email: "one@example.com", firstName: null, lastName: null, createdAt: "2026-01-01" };
const preferences = (overrides: Partial<UserPreferences> = {}): UserPreferences => ({
  wasIntroduced: false,
  selectedLanguage: null,
  selectedTheme: null,
  selectedFormPresentation: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...overrides,
});

function renderSync() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </Provider>
    );
  }
  return renderHook(useUserPreferencesSync, { wrapper });
}

beforeEach(async () => {
  await initializeTestI18n();
  vi.mocked(useCurrentUser).mockReturnValue({ data: currentUser, isPending: false } as ReturnType<
    typeof useCurrentUser
  >);
  vi.mocked(useUserPreferences).mockReturnValue({ data: preferences(), isPending: false } as ReturnType<
    typeof useUserPreferences
  >);
  vi.mocked(useUpdateUserPreferences).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  store.dispatch(setTheme("system"));
});

test("does not upload local values when server preferences are unset", async () => {
  window.localStorage.setItem(
    "userPreferences",
    JSON.stringify({ theme: "light", language: "uk", wasIntroduced: true }),
  );
  const update = vi.fn();
  vi.mocked(useUpdateUserPreferences).mockReturnValue({ mutate: update, isPending: false } as never);

  renderSync();

  await waitFor(() =>
    expect(readLocalUserPreferences()).toMatchObject({ language: "uk", theme: "light", wasIntroduced: false }),
  );
  expect(update).not.toHaveBeenCalled();
});

test("applies existing server language and theme values", async () => {
  vi.mocked(useUserPreferences).mockReturnValue({
    data: preferences({ selectedLanguage: "uk", selectedTheme: "light", selectedFormPresentation: "modal" }),
    isPending: false,
  } as ReturnType<typeof useUserPreferences>);

  renderSync();

  await waitFor(() => expect(i18n.resolvedLanguage).toBe("uk"));
  await waitFor(() =>
    expect(readLocalUserPreferences()).toMatchObject({
      language: "uk",
      theme: "light",
      formPresentation: "modal",
      wasIntroduced: false,
    }),
  );
  expect(store.getState().ui.jobFormPresentation).toBe("modal");
});

test("does not reuse a previous account's welcome cache during an account transition", async () => {
  window.localStorage.setItem(
    "userPreferences",
    JSON.stringify({ theme: "dark", language: "ru", wasIntroduced: true }),
  );
  vi.mocked(useUserPreferences).mockReturnValue({
    data: preferences({ wasIntroduced: false, selectedLanguage: "en", selectedTheme: "light" }),
    isPending: false,
  } as ReturnType<typeof useUserPreferences>);

  renderSync();

  await waitFor(() => expect(readLocalUserPreferences().wasIntroduced).toBe(false));
});

test("a delayed account read cannot overwrite a choice made while preferences were loading", async () => {
  vi.mocked(useUserPreferences).mockReturnValue({ data: undefined, isPending: true } as never);
  const client = new QueryClient();
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </Provider>
    );
  }
  const { result, rerender } = renderHook(
    () => {
      useUserPreferencesSync();
      return useThemePreference();
    },
    { wrapper },
  );
  act(() => result.current.changeTheme("dark"));
  vi.mocked(useUserPreferences).mockReturnValue({
    data: preferences({ selectedTheme: "light", wasIntroduced: true }),
    isPending: false,
  } as never);
  rerender();
  await waitFor(() => expect(readLocalUserPreferences().wasIntroduced).toBe(true));
  expect(store.getState().ui.theme).toBe("dark");
  expect(readLocalUserPreferences().theme).toBe("dark");
  client.clear();
});

test("StrictMode still applies the account language after the first effect is cancelled", async () => {
  vi.mocked(useUserPreferences).mockReturnValue({
    data: preferences({ selectedLanguage: "he", selectedTheme: "light" }),
    isPending: false,
  } as never);
  const client = new QueryClient();
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <StrictMode>
        <Provider store={store}>
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </Provider>
      </StrictMode>
    );
  }
  renderHook(useUserPreferencesSync, { wrapper });
  await waitFor(() => expect(i18n.resolvedLanguage).toBe("he"));
  expect(document.documentElement.dir).toBe("rtl");
  client.clear();
});

test("a fresh account session wins again even when returning to the same owner before React renders", async () => {
  const client = new QueryClient();
  client.setQueryData(["auth", "me"], { data: { user: currentUser } });
  vi.mocked(useUserPreferences).mockReturnValue({
    data: preferences({ selectedTheme: "light" }),
    isPending: false,
  } as never);
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </Provider>
    );
  }
  const { result } = renderHook(
    () => {
      useUserPreferencesSync();
      return useThemePreference();
    },
    { wrapper },
  );
  act(() => result.current.changeTheme("dark"));
  await act(async () => {
    client.setQueryData(["auth", "me"], { data: { user: { id: 2 } } });
    client.setQueryData(["auth", "me"], { data: { user: currentUser } });
  });
  expect(store.getState().ui.theme).toBe("light");
  client.clear();
});
