import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import type { UserPreferences } from "@xeniway/shared";
import { Provider } from "react-redux";
import { beforeEach, expect, test, vi } from "vitest";
import { i18n, initializeI18n } from "../../i18n/i18n";
import { useCurrentUser, useUpdateUserPreferences, useUserPreferences } from "../../lib/queries";
import { readLocalUserPreferences } from "../../lib/user-preferences";
import { setTheme, store } from "../../store";
import { UserPreferencesSync } from "./user-preferences-sync";

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
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <UserPreferencesSync />
      </QueryClientProvider>
    </Provider>,
  );
}

beforeEach(async () => {
  await initializeI18n();
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
