import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setAllStatuses, setSearch, store } from "../../../../store";
import { initializeTestI18n } from "../../../../test/initialize-test-i18n";
import { createApplicationWorkspaceData } from "../test-support/application-workspace-fixtures";
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
