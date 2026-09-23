import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { initializeI18n } from "../../i18n/i18n";
import { CsvExportButton } from "./csv-export-button";

const { mutate, useExportMutation } = vi.hoisted(() => ({
  mutate: vi.fn(),
  useExportMutation: vi.fn(),
}));

vi.mock("../../lib/queries", () => ({
  useApplicationsCsvExport: useExportMutation,
}));

beforeEach(async () => {
  await initializeI18n();
  mutate.mockReset();
  useExportMutation.mockReturnValue({ mutate, isPending: false, isError: false });
});

test("starts an export from the accessible CSV button", async () => {
  const user = userEvent.setup();
  render(<CsvExportButton />);

  await user.click(screen.getByRole("button", { name: "Export CSV" }));

  expect(mutate).toHaveBeenCalledOnce();
});

test("shows a localized alert when export fails", () => {
  useExportMutation.mockReturnValue({ mutate, isPending: false, isError: true });
  render(<CsvExportButton />);

  expect(screen.getByRole("alert")).toHaveTextContent("CSV export failed. Please try again.");
});
