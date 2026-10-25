import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import type { JobApplication } from "@xeniway/shared";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { type ApplicationList, applicationKeys } from "../../../lib/api";
import { authKeys } from "../../../lib/queries";
import { HomePage } from "../../../pages/home-page.view";
import { setAllStatuses, setSearch, store, toggleStatus } from "../../../store";
import { initializeTestI18n } from "../../../test/initialize-test-i18n";
import { ArchivePage } from "../archive/archive-page.view";
import { BlacklistPage } from "../blacklist/blacklist-page.view";
import { useApplicationBulkDelete } from "./application-bulk-delete.model";
import { ApplicationBulkDelete } from "./application-bulk-delete.view";

const boards = [
  { board: "active", Page: HomePage, label: "Delete all active applications" },
  { board: "archive", Page: ArchivePage, label: "Delete all archived applications" },
  { board: "blacklist", Page: BlacklistPage, label: "Delete all blacklisted applications" },
] as const;

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

const clients: QueryClient[] = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

beforeEach(async () => {
  await initializeTestI18n();
  store.dispatch(setSearch(""));
  store.dispatch(setAllStatuses(true));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const client of clients.splice(0)) {
    client.clear();
  }
});

test("bulk deletion confirmation expires without affecting its persistent board actions", async () => {
  vi.useFakeTimers();
  const deleteApplications = vi.fn().mockResolvedValue(undefined);
  render(
    <main id="main-content" tabIndex={-1}>
      <ApplicationBulkDelete board="archive" count={2} deleteApplications={deleteApplications} />
    </main>,
  );
  fireEvent.click(screen.getByText("Board actions", { selector: "summary" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete all archived applications" }));
  await act(async () => {
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete all archived applications" }),
    );
  });
  expect(screen.getByRole("status")).toHaveTextContent("Applications deleted.");
  act(() => vi.advanceTimersByTime(10_000));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete all archived applications" })).toBeVisible();
  expect(deleteApplications).toHaveBeenCalledExactlyOnceWith("archive");
});

function renderBoard({ board, Page }: (typeof boards)[number], empty = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  const records = empty ? [] : [application, { ...application, id: 2, company: "Hidden", status: "offer" as const }];
  const listKey = applicationKeys.list(1, board);
  const listResponse = { data: { applications: records } };
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "owner@example.com" } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "test-csrf" } });
  client.setQueryData(listKey, listResponse);
  const deletion = deferred<Response>();
  const submittedBoards: ApplicationList[] = [];
  let response = listResponse;
  const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === "/api/applications/remove-all") {
      submittedBoards.push(JSON.parse(String(init?.body)).board);
      return deletion.promise;
    }
    return Response.json(response);
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <QueryClientProvider client={client}>
      <Provider store={store}>
        <MemoryRouter>
          <main id="main-content" tabIndex={-1}>
            <Page />
          </main>
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
  return {
    client,
    deletion,
    submittedBoards,
    fetcher,
    clearRecords() {
      response = { data: { applications: [] } };
    },
  };
}

async function openFinalConfirmation(board: ApplicationList, label: string) {
  fireEvent.click(screen.getByText("Board actions", { selector: "summary" }));
  const opener = screen.getByRole("button", { name: label });
  opener.focus();
  fireEvent.click(opener);
  if (board === "active") {
    vi.useFakeTimers();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Continue" }));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    vi.useRealTimers();
  }
  return opener;
}

test.each(boards)("$board deletion describes the whole board despite search and status filters", async (config) => {
  store.dispatch(setSearch("Example"));
  store.dispatch(toggleStatus("offer"));
  const { submittedBoards } = renderBoard(config);
  await openFinalConfirmation(config.board, config.label);

  const dialog = screen.getByRole("alertdialog");
  expect(dialog).toHaveTextContent("Applications currently loaded on this board: 2");
  expect(dialog).toHaveTextContent("Search and status filters do not limit deletion");
  expect(dialog).toHaveTextContent(config.label);
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(submittedBoards).toEqual([]);
});

test.each(boards)(
  "$board deletion stays pending, shows failure in the dialog, and permits an explicit retry",
  async (config) => {
    const { submittedBoards, deletion, fetcher } = renderBoard(config);
    await openFinalConfirmation(config.board, config.label);
    const dialog = screen.getByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", { name: config.label });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(submittedBoards).toEqual([config.board]));
    expect(dialog).toHaveAttribute("aria-busy", "true");
    expect(within(dialog).getByRole("button", { name: "Deleting…" })).toBeDisabled();
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(dialog).toBeInTheDocument();

    await act(async () => deletion.resolve(Response.json({ error: { code: "REQUEST_FAILED" } }, { status: 409 })));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
    expect(confirm).toBeEnabled();
    const retry = deferred<Response>();
    fetcher.mockImplementationOnce(async () => {
      submittedBoards.push(config.board);
      return retry.promise;
    });
    fireEvent.click(confirm);
    await waitFor(() => expect(submittedBoards).toEqual([config.board, config.board]));
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => retry.resolve(Response.json({ data: { message: "Deleted" } })));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  },
);

test.each(boards)(
  "$board deletion refreshes real query data and restores focus after the board becomes empty",
  async (config) => {
    const { deletion, clearRecords, client, submittedBoards } = renderBoard(config);
    await openFinalConfirmation(config.board, config.label);
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: config.label }));
    await waitFor(() => expect(submittedBoards).toEqual([config.board]));
    clearRecords();
    await act(async () => deletion.resolve(Response.json({ data: { message: "Deleted" } })));

    expect(client.getQueryData(applicationKeys.list(1, config.board))).toEqual({ data: { applications: [] } });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: config.label })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Applications deleted.");
    await waitFor(() => expect(screen.getByRole("region", { name: "Board actions" })).toHaveFocus());
  },
);

test.each(boards)("$board deletion cannot start while offline", async (config) => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const { submittedBoards } = renderBoard(config);
  fireEvent.click(screen.getByText("Board actions", { selector: "summary" }));
  expect(screen.getByRole("button", { name: config.label })).toBeDisabled();
  expect(submittedBoards).toEqual([]);
});

test("guards duplicate confirmation and cancellation synchronously, before React rerenders", async () => {
  const deletion = deferred<void>();
  const deleteApplications = vi.fn(() => deletion.promise);
  const { result } = renderHook(() => useApplicationBulkDelete({ board: "archive", count: 2, deleteApplications }));
  act(() => result.current.open());
  let submitted!: Promise<void>;
  act(() => {
    const { confirm, close } = result.current;
    submitted = confirm();
    void confirm();
    close();
  });
  expect(deleteApplications).toHaveBeenCalledExactlyOnceWith("archive");
  expect(result.current.stage).toBe("confirm");
  expect(result.current.pending).toBe(true);
  await act(async () => {
    deletion.resolve();
    await submitted;
  });
  expect(result.current.stage).toBe("closed");
});

test("a deliberate new attempt clears the previous error and cancel sends no additional request", async () => {
  const config = boards[1];
  const { deletion, submittedBoards } = renderBoard(config);
  const opener = await openFinalConfirmation(config.board, config.label);
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: config.label }));
  await act(async () => deletion.resolve(Response.json({ error: { code: "REQUEST_FAILED" } }, { status: 409 })));
  const dialog = screen.getByRole("alertdialog");
  expect(within(dialog).getByRole("alert")).toBeVisible();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(opener).toHaveFocus());
  fireEvent.click(opener);
  expect(within(screen.getByRole("alertdialog")).queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
  expect(submittedBoards).toEqual(["archive"]);
});

test.each(boards)("$board deletion cannot start without any applications", async (config) => {
  const { submittedBoards } = renderBoard(config, true);
  fireEvent.click(screen.getByText("Board actions", { selector: "summary" }));
  expect(screen.getByRole("button", { name: config.label })).toBeDisabled();
  expect(submittedBoards).toEqual([]);
});
