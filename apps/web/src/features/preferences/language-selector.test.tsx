import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { beforeEach, expect, test, vi } from "vitest";
import { changeLocale, i18n, initializeI18n } from "../../i18n/i18n";
import { useCurrentUser, useUpdateUserPreferences } from "../../lib/queries";
import { readLocalUserPreferences } from "../../lib/user-preferences";
import { store } from "../../store";
import { LanguageSelector } from "./language-selector.view";

vi.mock("../../lib/queries", () => ({ useCurrentUser: vi.fn(), useUpdateUserPreferences: vi.fn() }));

beforeEach(async () => {
  await initializeI18n();
  vi.mocked(useCurrentUser).mockReturnValue({ data: null } as never);
  vi.mocked(useUpdateUserPreferences).mockReturnValue({ mutate: vi.fn() } as never);
});

test("keeps the authenticated language control interactive before preferences load", async () => {
  const user = userEvent.setup();
  vi.mocked(useCurrentUser).mockReturnValue({ data: { id: 1 } } as never);
  render(
    <Provider store={store}>
      <LanguageSelector />
    </Provider>,
  );

  await user.click(screen.getByRole("button", { name: "Language: English. Change language" }));

  expect(screen.getByRole("menu")).toBeVisible();
  expect(screen.getByRole("menuitemradio", { name: "Russian" })).toBeVisible();
});

test("uses a compact visual label with an unambiguous accessible name", () => {
  render(
    <Provider store={store}>
      <LanguageSelector />
    </Provider>,
  );

  expect(screen.getByRole("button", { name: "Language: English. Change language" })).toHaveTextContent("EN");
});

test.each([
  ["ru", "Язык: Русский. Изменить язык"],
  ["uk", "Мова: Українська. Змінити мову"],
  ["he", "שפה: עברית. שינוי שפה"],
] as const)("localizes the language control in %s", async (locale, label) => {
  await changeLocale(locale);
  render(
    <Provider store={store}>
      <LanguageSelector />
    </Provider>,
  );
  expect(screen.getByRole("button")).toHaveAccessibleName(label);
});

test("selects a locale from the language menu", async () => {
  const user = userEvent.setup();
  render(
    <Provider store={store}>
      <LanguageSelector />
    </Provider>,
  );

  const mobileControl = screen.getByRole("button", { name: "Language: English. Change language" });

  await user.click(mobileControl);
  await user.click(screen.getByRole("menuitemradio", { name: "Ukrainian" }));

  await waitFor(() => expect(i18n.resolvedLanguage).toBe("uk"));
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("supports menu keyboard navigation and returns focus to the trigger", async () => {
  const user = userEvent.setup();
  render(
    <Provider store={store}>
      <LanguageSelector />
    </Provider>,
  );

  const trigger = screen.getByRole("button", { name: "Language: English. Change language" });
  trigger.focus();
  await user.keyboard("{Enter}");

  const english = screen.getByRole("menuitemradio", { name: "English" });
  expect(english).toHaveAttribute("aria-checked", "true");
  expect(english).toHaveFocus();

  await user.keyboard("{ArrowDown}");
  expect(screen.getByRole("menuitemradio", { name: "Russian" })).toHaveFocus();
  await user.keyboard("{End}");
  expect(screen.getByRole("menuitemradio", { name: "Hebrew" })).toHaveFocus();
  await user.keyboard("{Home}");
  expect(english).toHaveFocus();

  await user.keyboard("{Escape}");
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();

  await user.keyboard("{Enter}");
  await user.keyboard("{ArrowDown}{Enter}");
  await waitFor(() => expect(i18n.resolvedLanguage).toBe("ru"));
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Язык: Русский. Изменить язык" })).toHaveFocus();
});

test("keeps vertical menu movement and current-language state in RTL", async () => {
  const user = userEvent.setup();
  await changeLocale("he");
  render(
    <Provider store={store}>
      <LanguageSelector />
    </Provider>,
  );

  const trigger = screen.getByRole("button", { name: "שפה: עברית. שינוי שפה" });
  await user.click(trigger);

  const options = screen.getAllByRole("menuitemradio");
  expect(options[3]).toHaveAttribute("aria-checked", "true");
  expect(options[3]).toHaveFocus();
  await user.keyboard("{ArrowDown}");
  expect(options[0]).toHaveFocus();

  await changeLocale("en");
});

test("persists a language change for an authenticated user", async () => {
  const user = userEvent.setup();
  const mutate = vi.fn();
  vi.mocked(useCurrentUser).mockReturnValue({ data: { id: 1 } } as never);
  vi.mocked(useUpdateUserPreferences).mockReturnValue({ mutate } as never);
  render(
    <Provider store={store}>
      <LanguageSelector />
    </Provider>,
  );

  await user.click(screen.getByRole("button", { name: "Language: English. Change language" }));
  await user.click(screen.getByRole("menuitemradio", { name: "Russian" }));

  await waitFor(() => expect(mutate).toHaveBeenCalledWith({ selectedLanguage: "ru" }));
  expect(readLocalUserPreferences()).toMatchObject({ language: "ru" });
  expect(window.localStorage.getItem("userPreferences")).toContain('"language":"ru"');
});
