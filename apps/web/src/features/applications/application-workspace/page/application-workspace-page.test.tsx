import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setAllStatuses, setSearch, store } from "../../../../store";
import { initializeTestI18n } from "../../../../test/initialize-test-i18n";
import { createApplicationWorkspaceData, workspaceFollowUpTask } from "../test-support/application-workspace-fixtures";
import { renderApplicationWorkspacePage } from "../test-support/render-application-workspace";

beforeEach(async () => {
  vi.restoreAllMocks();
  await initializeTestI18n();
});

afterEach(() => {
  vi.unstubAllGlobals();
  store.dispatch(setSearch(""));
  store.dispatch(setAllStatuses(true));
});

test("invalid IDs render not found without issuing a request", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);

  renderApplicationWorkspacePage("/applications/0");

  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeVisible();
  expect(fetcher).not.toHaveBeenCalled();
});

test("API not-found responses render the not-found page", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }), { status: 404 }),
      ),
  );

  renderApplicationWorkspacePage("/applications/999");

  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("renders a loading state while the application request is pending", () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => undefined)),
  );

  renderApplicationWorkspacePage("/applications/3");

  expect(screen.getByText("Loading…")).toBeVisible();
});

test("retries a failed request and renders the workspace", async () => {
  const user = userEvent.setup();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "REQUEST_FAILED", message: "Request failed" } }), { status: 500 }),
    )
    .mockResolvedValueOnce(workspaceResponse());
  vi.stubGlobal("fetch", fetcher);
  renderApplicationWorkspacePage("/applications/3");

  expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
  await user.click(screen.getByRole("button", { name: "Retry" }));

  expect(await screen.findByRole("heading", { name: "Northwind" })).toBeVisible();
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test("composes every workspace domain from one application-detail request", async () => {
  const fetcher = vi.fn().mockResolvedValue(workspaceResponse());
  vi.stubGlobal("fetch", fetcher);
  const { container } = renderApplicationWorkspacePage("/applications/3");

  expect(await screen.findByRole("heading", { name: "Northwind" })).toHaveFocus();
  expect(screen.getByRole("region", { name: "About" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Interview preparation" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Contacts" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Follow-ups" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Activity" })).toBeVisible();
  expect(container.querySelector("main")).toBeNull();
  expect(screen.getByRole("button", { name: "Previous application" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Next application" })).toBeDisabled();
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(fetcher).toHaveBeenCalledWith("/api/applications/3", expect.anything());
});

test("completion reorders follow-ups from the detail cache and preserves edit focus", async () => {
  const user = userEvent.setup();
  const previouslyCompletedTask = {
    ...workspaceFollowUpTask,
    id: 9,
    title: "Earlier call",
    dueDate: "2026-09-20",
    completedAt: "2026-09-20T00:00:00.000Z",
  };
  const openTask = workspaceFollowUpTask;
  const completedTask = { ...openTask, completedAt: "2026-09-23T00:00:00.000Z" };
  const initialWorkspace = createApplicationWorkspaceData({ followUpTasks: [previouslyCompletedTask, openTask] });
  const refetchedWorkspace = createApplicationWorkspaceData({
    followUpTasks: [previouslyCompletedTask, completedTask],
  });
  let resolveRefetch!: (response: Response) => void;
  const refetch = new Promise<Response>((resolve) => {
    resolveRefetch = resolve;
  });
  let detailRequestCount = 0;
  const fetcher = vi.fn((path: string) => {
    if (path === "/api/applications/3") {
      detailRequestCount += 1;
      if (detailRequestCount === 1) {
        return Promise.resolve(new Response(JSON.stringify({ data: initialWorkspace }), { status: 200 }));
      }
      return refetch;
    }
    if (path === "/api/applications/3/follow-ups/8/complete") {
      return Promise.resolve(new Response(JSON.stringify({ data: { followUpTask: completedTask } }), { status: 200 }));
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  vi.stubGlobal("fetch", fetcher);

  renderApplicationWorkspacePage("/applications/3");

  expect(await screen.findByRole("button", { name: "Complete Write to Ari" })).toBeVisible();
  const initialItems = screen.getAllByRole("listitem");
  expect(within(initialItems[0]).getByRole("heading", { name: "Write to Ari" })).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Complete Write to Ari" }));

  await waitFor(() => {
    const completedItems = screen.getAllByRole("listitem");
    expect(within(completedItems[0]).getByRole("heading", { name: "Earlier call" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Edit Write to Ari" })).toHaveFocus();
  });
  expect(fetcher).toHaveBeenCalledWith("/api/applications/3/follow-ups/8/complete", expect.anything());

  resolveRefetch(new Response(JSON.stringify({ data: refetchedWorkspace }), { status: 200 }));
});

test("navigates through columns and wraps with fresh editor state and destination heading focus", async () => {
  store.dispatch(setSearch("Northwind"));
  store.dispatch(setAllStatuses(false));
  const user = userEvent.setup();
  const initial = createApplicationWorkspaceData();
  const second = createApplicationWorkspaceData({ application: { ...initial.application, id: 4, company: "Contoso" } });
  const last = createApplicationWorkspaceData({
    application: { ...initial.application, id: 5, company: "Tailspin", status: "offer" },
  });
  const records = [initial, second, last];
  const fetcher = vi.fn((path: string) => {
    const record = records.find(({ application }) => path === `/api/applications/${application.id}`);
    return Promise.resolve(new Response(JSON.stringify({ data: record })));
  });
  vi.stubGlobal("fetch", fetcher);
  renderApplicationWorkspacePage(
    "/applications/3",
    records.map(({ application }) => application),
  );

  expect(await screen.findByRole("heading", { name: "Northwind" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "About, Edit" }));
  const about = screen.getByRole("textbox", { name: "About" });
  await user.click(about);
  await user.paste("First application draft");
  expect(about).toHaveValue("First application draft");
  await user.click(screen.getByRole("button", { name: "Next application" }));
  expect(await screen.findByRole("heading", { name: "Contoso" })).toHaveFocus();
  expect(screen.queryByRole("textbox", { name: "About" })).toBeNull();

  await user.click(screen.getByRole("button", { name: "Next application" }));
  expect(await screen.findByRole("heading", { name: "Tailspin" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Next application" }));
  expect(await screen.findByRole("heading", { name: "Northwind" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Previous application" }));
  expect(await screen.findByRole("heading", { name: "Tailspin" })).toHaveFocus();
});

function workspaceResponse() {
  return new Response(JSON.stringify({ data: createApplicationWorkspaceData() }), { status: 200 });
}
