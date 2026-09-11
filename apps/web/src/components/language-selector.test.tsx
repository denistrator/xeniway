import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { initializeI18n } from "../i18n/i18n";
import { LanguageSelector } from "./language-selector";

beforeEach(async () => {
  await initializeI18n();
});

test("uses compact visual labels with unambiguous accessible names", () => {
  render(<LanguageSelector />);

  expect(screen.getByRole("group", { name: /language/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "English" })).toHaveTextContent("EN");
  expect(screen.getByRole("button", { name: "Українська" })).toHaveTextContent("UK");
});
