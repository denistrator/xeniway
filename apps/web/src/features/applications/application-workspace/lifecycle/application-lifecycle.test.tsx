import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { JobApplication } from "@xeniway/shared";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { changeLocale, initializeI18n } from "../../../../i18n/i18n";
import { authKeys } from "../../../../lib/queries";
import { createApplicationWorkspaceData } from "../test-support/application-workspace-fixtures";
import { ApplicationLifecycleActions } from "./application-lifecycle-actions";

beforeEach(async () => {
  vi.restoreAllMocks();
  await initializeI18n();
  await changeLocale("en");
});

test.each([
  { state: {}, present: ["Archive application", "Add to blacklist"], absent: ["Restore application"] },
  {
    state: { archivedAt: "2026-09-20T00:00:00.000Z" },
    present: ["Restore application", "Delete permanently"],
    absent: ["Archive application"],
  },
  {
    state: { blacklistedAt: "2026-09-20T00:00:00.000Z" },
    present: ["Restore application", "Delete permanently"],
    absent: ["Add to blacklist"],
  },
])("shows actions for the application's current board", ({ state, present, absent }) => {
  renderLifecycle(createApplication(state));

  for (const label of present) expect(screen.getByRole("button", { name: label })).toBeVisible();
  for (const label of absent) expect(screen.queryByRole("button", { name: label })).toBeNull();
});

test("requires confirmation before archiving", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: { message: "Archived" } }), {
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  renderLifecycle(createApplication());

  await user.click(screen.getByRole("button", { name: "Archive application" }));
  const dialog = screen.getByRole("alertdialog");
  await user.click(within(dialog).getByRole("button", { name: "Archive application" }));

  await waitFor(() => expect(screen.getByTestId("pathname")).toHaveTextContent("/"));
  expect(fetcher).toHaveBeenCalledWith("/api/applications/3/archive", expect.objectContaining({ method: "POST" }));
  const headers = new Headers(fetcher.mock.calls[0][1]?.headers);
  expect(headers.get("x-csrf-token")).toBe("csrf");
});

test("restoring a blacklisted archived application returns to Archive", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: { message: "Restored" } }), {
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  renderLifecycle(
    createApplication({
      archivedAt: "2026-09-20T00:00:00.000Z",
      blacklistedAt: "2026-09-21T00:00:00.000Z",
    }),
  );

  await user.click(screen.getByRole("button", { name: "Restore application" }));

  await waitFor(() => expect(screen.getByTestId("pathname")).toHaveTextContent("/archive"));
  expect(fetcher).toHaveBeenCalledWith("/api/applications/3/unblacklist", expect.objectContaining({ method: "POST" }));
});

test("reports restore failures without navigating", async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "REQUEST_FAILED", message: "Request failed" } }), { status: 500 }),
      ),
  );
  renderLifecycle(createApplication({ archivedAt: "2026-09-20T00:00:00.000Z" }));

  await user.click(screen.getByRole("button", { name: "Restore application" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
  expect(screen.getByTestId("pathname")).toHaveTextContent("/applications/3");
});

function createApplication(overrides: Partial<JobApplication> = {}): JobApplication {
  return { ...createApplicationWorkspaceData().application, ...overrides };
}

function renderLifecycle(application: JobApplication) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/applications/${application.id}`]}>
        <ApplicationLifecycleActions application={application} />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="pathname">{location.pathname}</output>;
}
