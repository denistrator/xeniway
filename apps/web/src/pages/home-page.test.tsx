import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { JobApplication } from "@xeniway/shared";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { store } from "../store";
import { initializeTestI18n } from "../test/initialize-test-i18n";
import { HomePage } from "./home-page.view";

const mocks = vi.hoisted(() => ({
  applications: vi.fn(),
  mutations: vi.fn(),
  canMutate: vi.fn(),
}));

vi.mock("../lib/queries", () => ({
  useApplications: () => mocks.applications(),
  useApplicationMutations: () => mocks.mutations(),
}));

vi.mock("../features/offline/offline-access.model", () => ({
  useCanMutate: () => mocks.canMutate(),
}));

const application: JobApplication = {
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
  mocks.canMutate.mockReturnValue(true);
  mocks.mutations.mockReturnValue({
    update: { mutateAsync: vi.fn() },
    reorder: { mutateAsync: vi.fn() },
    removeAll: { mutateAsync: vi.fn() },
  });
  mocks.applications.mockReturnValue({ data: [application], isPending: false, error: null, refetch: vi.fn() });
});

function renderHome() {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </Provider>,
  );
}

test("offers Retry for a failed board read while retaining cached applications", async () => {
  const refetch = vi.fn();
  mocks.applications.mockReturnValue({ data: [application], isPending: false, error: new Error("offline"), refetch });
  renderHome();

  expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
  expect(screen.getByRole("link", { name: /Example/ })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(refetch).toHaveBeenCalledOnce();
});

test("keeps the board usable and reports a rejected status change", async () => {
  const update = vi.fn().mockRejectedValue(new Error("offline"));
  mocks.mutations.mockReturnValue({
    update: { mutateAsync: update },
    reorder: { mutateAsync: vi.fn() },
    removeAll: { mutateAsync: vi.fn() },
  });
  renderHome();

  const card = screen.getByRole("link", { name: /Example/ });
  fireEvent.keyDown(card, { key: "ArrowRight", shiftKey: true });

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Please try again."));
  expect(card).toBeVisible();
  expect(update).toHaveBeenCalledWith({ id: 1, input: { status: "applied" } });
});

test("keeps the board usable and reports a rejected reorder", async () => {
  const reorder = vi.fn().mockRejectedValue(new Error("offline"));
  mocks.applications.mockReturnValue({
    data: [application, { ...application, id: 2, company: "Second", sortOrder: 1 }],
    isPending: false,
    error: null,
    refetch: vi.fn(),
  });
  mocks.mutations.mockReturnValue({
    update: { mutateAsync: vi.fn() },
    reorder: { mutateAsync: reorder },
    removeAll: { mutateAsync: vi.fn() },
  });
  renderHome();

  const card = screen.getByRole("link", { name: /Example/ });
  fireEvent.keyDown(card, { key: "ArrowDown" });

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Please try again."));
  expect(card).toBeVisible();
  expect(reorder).toHaveBeenCalledWith({ status: "saved", applicationIds: [2, 1] });
});

test("announces a confirmed status change after the server accepts it", async () => {
  const update = vi.fn().mockResolvedValue({ data: { application } });
  mocks.mutations.mockReturnValue({
    update: { mutateAsync: update },
    reorder: { mutateAsync: vi.fn() },
    removeAll: { mutateAsync: vi.fn() },
  });
  renderHome();

  fireEvent.keyDown(screen.getByRole("link", { name: /Example/ }), { key: "ArrowRight", shiftKey: true });

  expect(await screen.findByRole("status")).toHaveTextContent("Application updated.");
  expect(update).toHaveBeenCalledWith({ id: 1, input: { status: "applied" } });
});
