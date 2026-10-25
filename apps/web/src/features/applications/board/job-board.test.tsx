import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { JobApplication } from "@xeniway/shared";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setAllStatuses, setSearch, store, toggleStatus } from "../../../store";
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
  store.dispatch(setAllStatuses(true));
  store.dispatch(setSearch(""));
});

afterEach(() => vi.useRealTimers());

test("new board results get a full timeout even when their copy is unchanged", () => {
  vi.useFakeTimers();
  const content = (id: object) => (
    <Provider store={store}>
      <MemoryRouter>
        <JobBoard
          jobs={[job]}
          operationSuccess="Application updated."
          operationSuccessId={id}
          onStatusChange={() => {}}
          onReorder={() => {}}
        />
      </MemoryRouter>
    </Provider>
  );
  const first = {};
  const second = {};
  const view = render(content(first));
  act(() => vi.advanceTimersByTime(9000));
  view.rerender(content(second));
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole("status")).toHaveTextContent("Application updated.");
  act(() => vi.advanceTimersByTime(9000));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Example/ })).toBeVisible();
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

test("status links focus their named columns and exclude filtered statuses", async () => {
  const user = userEvent.setup();
  render(
    <Provider store={store}>
      <MemoryRouter>
        <JobBoard jobs={[job]} onStatusChange={() => {}} onReorder={() => {}} />
      </MemoryRouter>
    </Provider>,
  );
  const navigation = screen.getByRole("navigation", { name: "Jump to status" });
  await user.click(within(navigation).getByRole("link", { name: "Offer" }));
  expect(screen.getByRole("heading", { name: "Offer" })).toHaveFocus();
  act(() => store.dispatch(toggleStatus("offer")));
  expect(within(navigation).queryByRole("link", { name: "Offer" })).not.toBeInTheDocument();
});

test("announces a confirmed board update once", () => {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <JobBoard jobs={[job]} operationSuccess="Application updated." onStatusChange={() => {}} onReorder={() => {}} />
      </MemoryRouter>
    </Provider>,
  );

  expect(screen.getByRole("status")).toHaveTextContent("Application updated.");
});

test("explains an empty board when no statuses are selected and can restore them", async () => {
  const user = userEvent.setup();
  store.dispatch(setAllStatuses(false));

  render(
    <Provider store={store}>
      <MemoryRouter>
        <JobBoard jobs={[job]} onStatusChange={() => {}} onReorder={() => {}} />
      </MemoryRouter>
    </Provider>,
  );

  expect(screen.getByRole("status")).toHaveTextContent("No statuses are selected.");
  await user.click(screen.getByRole("button", { name: "Show all statuses" }));
  expect(screen.getByRole("link", { name: "Example, Engineer, Saved" })).toBeVisible();
});

test("offers a search-specific recovery without changing selected statuses", async () => {
  const user = userEvent.setup();
  store.dispatch(setSearch("missing"));

  render(
    <Provider store={store}>
      <MemoryRouter>
        <JobBoard jobs={[job]} onStatusChange={() => {}} onReorder={() => {}} />
      </MemoryRouter>
    </Provider>,
  );

  expect(screen.getByRole("status")).toHaveTextContent("No applications match the current search and status filters.");
  await user.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getByRole("link", { name: "Example, Engineer, Saved" })).toBeVisible();
});
