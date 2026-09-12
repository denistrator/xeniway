import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";
import { i18n, initializeI18n } from "../i18n/i18n";
import { LanguageSelector, nextLocale } from "./language-selector";

beforeEach(async () => {
  await initializeI18n();
});

test("uses a compact visual label with an unambiguous accessible name", () => {
  render(<LanguageSelector />);

  expect(screen.getByRole("button", { name: "Language: English. Change language" })).toHaveTextContent("EN");
});

test("rotates the current locale from the mobile language control", async () => {
  const user = userEvent.setup();
  render(<LanguageSelector />);

  const mobileControl = screen.getByRole("button", { name: "Language: English. Change language" });

  await user.click(mobileControl);

  await waitFor(() => expect(i18n.resolvedLanguage).toBe(nextLocale("en")));
  expect(screen.getByRole("button", { name: "Language: Русский. Change language" })).toHaveTextContent("RU");
});
