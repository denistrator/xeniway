import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { changeLocale } from "../i18n/i18n";
import { store } from "../store";
import { initializeTestI18n } from "../test/initialize-test-i18n";
import { SettingsPage } from "./settings-page.tsx";

let client: QueryClient;

beforeEach(async () => {
  client = new QueryClient();
  await initializeTestI18n();
});

afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
});

test.each([
  { locale: "en", title: "Settings" },
  { locale: "ru", title: "Настройки" },
  { locale: "uk", title: "Налаштування" },
  { locale: "he", title: "הגדרות" },
] as const)("renders the Settings heading in $locale with offline access", async ({ locale, title }) => {
  await changeLocale(locale);
  render(
    <QueryClientProvider client={client}>
      <Provider store={store}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );

  expect(screen.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
  expect(screen.getAllByRole("combobox")).toHaveLength(2);
  expect(screen.getByRole("link")).toHaveAttribute("href", "/login");
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.queryByRole("button", { name: "Export package" })).toBeNull();
});

test.each([true, false])("offers export only in signed-in Settings with online=%s", (online) => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
  client.setQueryData(["auth", "me"], { data: { user: { id: 1, email: "candidate@example.com" } } });
  render(
    <QueryClientProvider client={client}>
      <Provider store={store}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
  expect(screen.getByRole("region", { name: "Export data" })).toBeVisible();
  const button = screen.getByRole("button", { name: "Export package" });
  if (online) {
    expect(button).toBeEnabled();
  } else {
    expect(button).toBeDisabled();
    expect(screen.getByText("Connect and verify your session to export your data.")).toBeVisible();
  }
});
