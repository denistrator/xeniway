import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { beforeEach, expect, test, vi } from "vitest";
import { i18n, initializeI18n } from "../i18n/i18n";
import { useCurrentUser, useUpdateUserPreferences } from "../lib/queries";
import { readLocalUserPreferences } from "../lib/user-preferences";
import { store } from "../store";
import { LanguageSelector, nextLocale } from "./language-selector";

vi.mock("../lib/queries", () => ({ useCurrentUser: vi.fn(), useUpdateUserPreferences: vi.fn() }));

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

  await waitFor(() => expect(i18n.resolvedLanguage).toBe("ru"));
});

test("uses a compact visual label with an unambiguous accessible name", () => {
  render(
    <Provider store={store}>
      <LanguageSelector />
    </Provider>,
  );

  expect(screen.getByRole("button", { name: "Language: English. Change language" })).toHaveTextContent("EN");
});

test("rotates the current locale from the mobile language control", async () => {
  const user = userEvent.setup();
  render(
    <Provider store={store}>
      <LanguageSelector />
    </Provider>,
  );

  const mobileControl = screen.getByRole("button", { name: "Language: English. Change language" });

  await user.click(mobileControl);

  await waitFor(() => expect(i18n.resolvedLanguage).toBe(nextLocale("en")));
  expect(screen.getByRole("button", { name: "Language: Русский. Change language" })).toHaveTextContent("RU");
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

  await waitFor(() => expect(mutate).toHaveBeenCalledWith({ selectedLanguage: "ru" }));
  expect(readLocalUserPreferences()).toMatchObject({ language: "ru" });
  expect(window.localStorage.getItem("userPreferences")).toContain('"language":"ru"');
});
