import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import { useOfflineAccess } from "../offline/offline-access.model";
import { ExportSettingsSection } from "./export-settings-section.view";

vi.mock("../offline/offline-access.model", () => ({
  useOfflineAccess: vi.fn(),
}));

vi.mock("./csv-export-button.view", () => ({
  CsvExportButton: () => <button type="button">Export package</button>,
}));

beforeEach(async () => {
  await initializeTestI18n();
  vi.mocked(useOfflineAccess).mockReturnValue({
    readAccountId: 1,
    canMutate: true,
  } as ReturnType<typeof useOfflineAccess>);
});

test("explains that related exported rows cannot be reliably matched", () => {
  render(<ExportSettingsSection />);

  expect(screen.getByRole("heading", { name: "Export data" })).toBeVisible();
  expect(screen.getByText(/Activity history and salary are not included\.$/)).toBeVisible();
  expect(
    screen.getByText(
      "Contacts and follow-ups cannot be reliably matched to an application row from this package alone.",
    ),
  ).toBeVisible();
});
