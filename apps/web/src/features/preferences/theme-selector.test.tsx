import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { beforeEach, expect, test, vi } from "vitest";
import { changeLocale } from "../../i18n/i18n";
import { useCurrentUser, useUpdateUserPreferences } from "../../lib/queries";
import { readLocalUserPreferences } from "../../lib/user-preferences";
import { setTheme, store } from "../../store";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import { nextThemePreference } from "./theme-selector.ts";
import { ThemeSelector } from "./theme-selector.tsx";

vi.mock("../../lib/queries", () => ({
  useCurrentUser: vi.fn(),
  useUpdateUserPreferences: vi.fn(),
}));

beforeEach(async () => {
  await initializeTestI18n();
  vi.mocked(useCurrentUser).mockReturnValue({ data: { id: 1 } } as never);
  vi.mocked(useUpdateUserPreferences).mockReturnValue({ mutate: vi.fn() } as never);
  store.dispatch(setTheme("system"));
});

test("cycles through light, system, and dark preferences", () => {
  expect(nextThemePreference("light")).toBe("system");
  expect(nextThemePreference("system")).toBe("dark");
  expect(nextThemePreference("dark")).toBe("light");
});

test.each([
  ["ru", "Тема: Системная. Изменить тему"],
  ["uk", "Тема: Системна. Змінити тему"],
  ["he", "ערכת נושא: מערכת. שינוי ערכת נושא"],
] as const)("localizes the theme control in %s", async (locale, label) => {
  await changeLocale(locale);
  render(
    <Provider store={store}>
      <ThemeSelector />
    </Provider>,
  );
  expect(screen.getByRole("button")).toHaveAccessibleName(label);
});

test("persists an authenticated theme change before preferences load", async () => {
  const user = userEvent.setup();
  const mutate = vi.fn();
  vi.mocked(useUpdateUserPreferences).mockReturnValue({ mutate } as never);
  render(
    <Provider store={store}>
      <QueryClientProvider client={new QueryClient()}>
        <ThemeSelector />
      </QueryClientProvider>
    </Provider>,
  );

  const button = screen.getByRole("button");
  await user.click(button);

  expect(mutate).toHaveBeenCalledWith({ selectedTheme: "dark" });
});

test("updates the UI immediately and persists the selected theme", async () => {
  const user = userEvent.setup();
  const mutate = vi.fn();
  vi.mocked(useUpdateUserPreferences).mockReturnValue({ mutate } as never);
  render(
    <Provider store={store}>
      <QueryClientProvider client={new QueryClient()}>
        <ThemeSelector />
      </QueryClientProvider>
    </Provider>,
  );

  await user.click(screen.getByRole("button"));

  expect(mutate).toHaveBeenCalledWith({ selectedTheme: "dark" });
  expect(screen.getByRole("button")).toHaveAccessibleName("Theme: Dark. Change theme");
  expect(readLocalUserPreferences()).toMatchObject({ theme: "dark" });
  expect(window.localStorage.getItem("userPreferences")).toContain('"theme":"dark"');
});
