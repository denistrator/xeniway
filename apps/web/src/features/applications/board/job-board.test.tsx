import { render, screen } from "@testing-library/react";
import type { JobApplication } from "@xeniway/shared";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test } from "vitest";
import { store } from "../../../store";
import { initializeTestI18n } from "../../../test/initialize-test-i18n";
import { JobBoard } from "./job-board.view";

const job: JobApplication = {
  id: 1,
  company: "Example",
  position: "Engineer",
  location: null,
  salary: null,
  jobUrl: null,
  description: null,
  status: "saved",
  sortOrder: 0,
  appliedAt: null,
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  archivedAt: null,
  blacklistedAt: null,
  blacklistReason: null,
};

beforeEach(async () => {
  await initializeTestI18n();
});

test("keeps the board usable while reporting a failed board operation", () => {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <JobBoard
          jobs={[job]}
          operationError="Something went wrong. Please try again."
          onStatusChange={() => {}}
          onReorder={() => {}}
        />
      </MemoryRouter>
    </Provider>,
  );

  expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
  expect(screen.getByRole("link", { name: /Example/ })).toBeVisible();
});
