import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { changeLocale } from "../i18n/i18n";
import { en } from "../i18n/locales/en";
import he from "../i18n/locales/he";
import ru from "../i18n/locales/ru";
import uk from "../i18n/locales/uk";
import { initializeTestI18n } from "../test/initialize-test-i18n";
import { AboutPage } from "./about-page.view";

beforeEach(initializeTestI18n);

test.each([ru, uk, he])("keeps every About dictionary structurally aligned with English", (dictionary) => {
  expect(Object.keys(dictionary.about).sort()).toEqual(Object.keys(en.about).sort());
  expect(Object.keys(dictionary.about.workflow).sort()).toEqual(Object.keys(en.about.workflow).sort());
  expect(Object.keys(dictionary.about.records).sort()).toEqual(Object.keys(en.about.records).sort());
  expect(Object.keys(dictionary.about.stack).sort()).toEqual(Object.keys(en.about.stack).sort());
  for (const value of Object.values(dictionary.about)) {
    if (typeof value === "string") {
      expect(value.trim()).not.toBe("");
    }
  }
});

test("explains the candidate workflow and data-access limits without authentication", () => {
  render(<AboutPage />);
  expect(screen.getByRole("heading", { level: 1, name: "Your job search, with the details intact." })).toBeVisible();
  const workflow = screen.getByRole("region", { name: "A next step, not a fixed path" });
  expect(within(workflow).getByRole("list")).toBeVisible();
  for (const status of ["Saved", "Applied", "Interview", "Offer", "Rejected", "Withdrawn"]) {
    expect(within(workflow).getByText(status, { exact: true })).toBeVisible();
  }
  expect(screen.getByRole("heading", { name: "Keep, set aside, or exclude" })).toBeVisible();
  expect(screen.getByText(/Blacklist is not an application status/)).toBeVisible();
  expect(screen.getByText(/Offline access is read-only/)).toBeVisible();
  expect(screen.getByText(/Installation does not download your private records/)).toBeVisible();
  expect(screen.getByText(/Activity history and salary are not included/)).toBeVisible();
  expect(screen.getByRole("heading", { name: "Privacy includes your device" })).toBeVisible();
  expect(screen.getByText("Built with", { selector: "summary" })).toBeVisible();
});

test.each([
  ["ru", "Ваш поиск работы — со всеми важными деталями."],
  ["uk", "Ваш пошук роботи — з усіма важливими деталями."],
  ["he", "חיפוש העבודה שלכם, עם כל הפרטים החשובים."],
] as const)("renders the product guide in %s", async (locale, title) => {
  await changeLocale(locale);
  render(<AboutPage />);
  expect(screen.getByRole("heading", { level: 1, name: title })).toBeVisible();
  expect(screen.queryByText("Your job search, with the details intact.")).not.toBeInTheDocument();
  expect(document.documentElement.lang).toBe(locale);
  expect(document.documentElement.dir).toBe(locale === "he" ? "rtl" : "ltr");
});
