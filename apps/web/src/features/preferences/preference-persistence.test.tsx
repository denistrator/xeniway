import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserPreferencesResponse } from "@xeniway/shared";
import { Provider } from "react-redux";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { i18n } from "../../i18n/i18n";
import { authKeys } from "../../lib/queries";
import { readLocalUserPreferences } from "../../lib/user-preferences";
import { setTheme, store } from "../../store";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import { LanguageSelector } from "./language-selector.view";
import { SettingsPreferences } from "./settings-preferences.view";
import { ThemeSelector } from "./theme-selector.view";

const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("../../lib/api", async (original) => ({
  ...(await original<typeof import("../../lib/api")>()),
  updateUserPreferences: save,
}));

const saved: UserPreferencesResponse = {
  data: {
    preferences: {
      selectedTheme: "dark",
      selectedLanguage: null,
      selectedFormPresentation: null,
      wasIntroduced: false,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  },
};
let client: QueryClient;

beforeEach(async () => {
  await initializeTestI18n();
  store.dispatch(setTheme("system"));
  save.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "one@example.com" } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
});

afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
});

function renderPreferences() {
  return render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <ThemeSelector />
        <LanguageSelector />
        <SettingsPreferences />
      </QueryClientProvider>
    </Provider>,
  );
}

test("does not render empty feedback status regions before any preference action", () => {
  renderPreferences();
  expect(screen.queryAllByRole("status")).toHaveLength(0);
});

test("shares sanitized account failure feedback and explicitly retries the latest choice", async () => {
  const user = userEvent.setup();
  save.mockRejectedValue(new Error("secret session=private raw server error"));
  renderPreferences();
  await user.click(screen.getByRole("button", { name: "Theme: System. Change theme" }));
  expect(store.getState().ui.theme).toBe("dark");
  expect(readLocalUserPreferences().theme).toBe("dark");
  await waitFor(() =>
    expect(screen.getAllByText("Applied on this device. Could not save to your account.")).toHaveLength(2),
  );
  expect(document.body).not.toHaveTextContent("secret session");
  await user.click(screen.getByRole("button", { name: "Theme: Dark. Change theme" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  save.mockResolvedValue(saved);
  await user.click(screen.getAllByRole("button", { name: "Retry account save" })[1]);
  await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
  expect(save.mock.calls[2][0]).toEqual({ selectedTheme: "light" });
  await waitFor(() => expect(screen.getAllByText("Saved to your account.")).toHaveLength(2));
});

test("keeps an offline choice local across reconnect until an explicit Retry", async () => {
  let online = false;
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);
  save.mockResolvedValue(saved);
  const user = userEvent.setup();
  renderPreferences();
  await user.click(screen.getByRole("button", { name: "Theme: System. Change theme" }));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getAllByText("Applied on this device. Not saved to your account.")).toHaveLength(2);
  online = true;
  await act(async () => window.dispatchEvent(new Event("online")));
  expect(save).not.toHaveBeenCalled();
  await user.click(screen.getAllByRole("button", { name: "Retry account save" })[0]);
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0]).toEqual({ selectedTheme: "dark" });
});

test("distinguishes storage failure from account success and keeps the choice applied", async () => {
  save.mockResolvedValue(saved);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("private quota details");
  });
  const user = userEvent.setup();
  renderPreferences();
  await user.click(screen.getByRole("button", { name: "Theme: System. Change theme" }));
  await waitFor(() => expect(screen.getAllByText("Saved to your account.")).toHaveLength(2));
  expect(store.getState().ui.theme).toBe("dark");
  expect(screen.getAllByText("Applied for this visit. Could not save on this device.")).toHaveLength(2);
  expect(document.body).not.toHaveTextContent("private quota");
});

test("clears the previous owner's retry when the account changes", async () => {
  save.mockRejectedValue(new Error("failed"));
  const user = userEvent.setup();
  renderPreferences();
  await user.click(screen.getByRole("button", { name: "Theme: System. Change theme" }));
  await screen.findAllByRole("button", { name: "Retry account save" });
  await act(async () => client.setQueryData(authKeys.me, { data: { user: { id: 2 } } }));
  expect(screen.queryByRole("button", { name: "Retry account save" })).not.toBeInTheDocument();
  expect(i18n.resolvedLanguage).toBe("en");
});
