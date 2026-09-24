import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { changeLocale, initializeI18n } from "../../../../i18n/i18n";
import { createApplicationWorkspaceData } from "../test-support/application-workspace-fixtures";
import { renderApplicationWorkspace } from "../test-support/render-application-workspace";

beforeEach(async () => {
  vi.restoreAllMocks();
  await initializeI18n();
  await changeLocale("en");
});

afterEach(() => vi.unstubAllGlobals());

test("places application details across the full header width with lifecycle actions at the inline end", () => {
  renderApplicationWorkspace();

  const locationField = screen
    .getByRole("button", { name: "Location, Edit" })
    .closest<HTMLElement>('[data-compact-edit-field="location"]');
  const detailsGrid = locationField?.parentElement;
  const lifecycleActions = screen.getByRole("navigation", { name: "Application actions" });

  expect(detailsGrid).toBeTruthy();
  expect(detailsGrid?.closest("header")).toBeTruthy();
  expect(detailsGrid).toHaveClass("sm:grid-cols-2", "lg:grid-cols-4");
  expect(detailsGrid?.children).toHaveLength(4);
  expect(lifecycleActions).toHaveClass("lg:justify-self-end");
});

test.each([
  { state: {}, label: "Back to Applications", href: "/" },
  { state: { archivedAt: "2026-09-20T00:00:00.000Z" }, label: "Back to Archive", href: "/archive" },
  { state: { blacklistedAt: "2026-09-20T00:00:00.000Z" }, label: "Back to Blacklist", href: "/blacklist" },
])("focuses the company heading and links back to the owning board", ({ state, label, href }) => {
  const data = createApplicationWorkspaceData();
  renderApplicationWorkspace({ application: { ...data.application, ...state } });

  expect(screen.getByRole("heading", { name: "Northwind" })).toHaveFocus();
  expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
});

test("confirms dirty compact changes and saves only the selected field", async () => {
  const user = userEvent.setup();
  const fetcher = stubApplicationUpdates();
  renderApplicationWorkspace();

  await user.click(screen.getByRole("button", { name: "Location, Edit" }));
  await user.type(screen.getByRole("textbox", { name: "Location" }), "Remote");
  await user.click(screen.getByRole("button", { name: "Company, Edit" }));

  const warning = screen.getByRole("alertdialog", { name: "Save changes before leaving?" });
  await user.click(within(warning).getByRole("button", { name: "Save" }));

  await waitFor(() => expect(screen.getByRole("textbox", { name: /Company/ })).toBeVisible());
  expect(readUpdateBodies(fetcher)[0]).toEqual({ location: "Remote" });
});

test("allows simultaneous large-field editing and nullable URL updates", async () => {
  const user = userEvent.setup();
  const data = createApplicationWorkspaceData();
  const fetcher = stubApplicationUpdates();
  renderApplicationWorkspace({ application: { ...data.application, jobUrl: "https://example.com/job" } });

  await user.click(screen.getByRole("button", { name: "About, Edit" }));
  await user.click(screen.getByRole("button", { name: "Application notes, Edit" }));
  expect(screen.getByRole("textbox", { name: "About" })).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Application notes" })).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Job listing, Edit" }));
  await user.clear(screen.getByRole("textbox", { name: "Job listing" }));
  await user.click(screen.getByRole("button", { name: "Save job listing" }));

  await waitFor(() => expect(screen.getByRole("button", { name: "Job listing, Edit" })).toHaveFocus());
  expect(readUpdateBodies(fetcher)).toContainEqual({ jobUrl: null });
});

test("saves status selection immediately and rejects unsafe job links", async () => {
  const user = userEvent.setup();
  const data = createApplicationWorkspaceData();
  const fetcher = stubApplicationUpdates();
  renderApplicationWorkspace({ application: { ...data.application, jobUrl: "javascript:alert(1)" } });

  expect(screen.queryByRole("link", { name: "javascript:alert(1)" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Status, Change status" }));
  await user.click(screen.getByRole("radio", { name: "Applied" }));

  await waitFor(() => expect(readUpdateBodies(fetcher)).toContainEqual({ status: "applied" }));
});

function stubApplicationUpdates() {
  const application = createApplicationWorkspaceData().application;
  const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          data: {
            application: { ...application, ...JSON.parse(String(init?.body ?? "{}")) },
          },
        }),
        { status: 200 },
      ),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

function readUpdateBodies(fetcher: ReturnType<typeof vi.fn>) {
  return fetcher.mock.calls
    .filter(([, init]) => init?.method === "PUT")
    .map(([, init]) => JSON.parse(String(init?.body)));
}
