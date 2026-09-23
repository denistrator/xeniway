import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { initializeI18n } from "../../../../i18n/i18n";
import { authKeys } from "../../../../lib/queries";
import { store } from "../../../../store";
import { ApplicationWorkspacePage } from "./application-workspace-page";

test("invalid IDs render not found without issuing a request", async () => {
  await initializeI18n();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  renderPage("/applications/0");
  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeVisible();
  expect(fetcher).not.toHaveBeenCalledWith("/api/applications/0", expect.anything());
  vi.unstubAllGlobals();
});

test("API not-found responses render the not-found page", async () => {
  await initializeI18n();
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(
        String(input) === "/api/auth/csrf"
          ? new Response(JSON.stringify({ data: { csrfToken: "csrf" } }), { status: 200 })
          : new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }), { status: 404 }),
      ),
    ),
  );
  renderPage("/applications/999");
  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeVisible();
});

test.each([
  { status: "saved", back: "Back to Applications", href: "/", action: "Archive application" },
  {
    status: "saved",
    archivedAt: "2026-09-20T00:00:00.000Z",
    back: "Back to Archive",
    href: "/archive",
    action: "Restore application",
  },
  {
    status: "saved",
    blacklistedAt: "2026-09-20T00:00:00.000Z",
    back: "Back to Blacklist",
    href: "/blacklist",
    action: "Restore application",
  },
  {
    status: "saved",
    archivedAt: "2026-09-19T00:00:00.000Z",
    blacklistedAt: "2026-09-20T00:00:00.000Z",
    back: "Back to Blacklist",
    href: "/blacklist",
    action: "Restore application",
  },
])("shows state-appropriate navigation and lifecycle action", async (application) => {
  await initializeI18n();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            application: {
              id: 7,
              company: "Northwind",
              position: "Engineer",
              location: "Remote",
              salary: null,
              jobUrl: null,
              description: null,
              appliedAt: null,
              notes: null,
              createdAt: "2026-09-01T00:00:00.000Z",
              updatedAt: "2026-09-01T00:00:00.000Z",
              sortOrder: 0,
              archivedAt: null,
              blacklistedAt: null,
              blacklistReason: null,
              ...application,
            },
            events: [],
            preparation: { companyResearch: null, talkingPoints: null, interviewerQuestions: null, updatedAt: null },
            contacts: [],
            followUpTasks: [],
          },
        }),
        { status: 200 },
      ),
    ),
  );
  renderPage("/applications/7");
  expect(await screen.findByRole("heading", { name: "Northwind" })).toBeVisible();
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Northwind" }));
  expect(screen.getByRole("link", { name: application.back })).toHaveAttribute("href", application.href);
  expect(screen.getByRole("button", { name: application.action })).toBeVisible();
  if (application.back === "Back to Applications") {
    expect(screen.getByRole("button", { name: "Edit application" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Add to blacklist" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Delete permanently" })).toBeNull();
  } else {
    expect(screen.getByRole("button", { name: "Delete permanently" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Edit application" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Archive application" })).toBeNull();
  }
  vi.unstubAllGlobals();
});

test("restoring a blacklisted application that is also archived returns to Archive", async () => {
  await initializeI18n();
  const fetcher = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/auth/csrf")
      return Promise.resolve(new Response(JSON.stringify({ data: { csrfToken: "csrf" } }), { status: 200 }));
    if (url === "/api/applications/7/unblacklist")
      return Promise.resolve(new Response(JSON.stringify({ data: { message: "Restored" } }), { status: 200 }));
    const application = {
      id: 7,
      company: "Northwind",
      position: "Engineer",
      status: "saved",
      location: null,
      salary: null,
      jobUrl: null,
      description: null,
      appliedAt: null,
      notes: null,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      sortOrder: 0,
      archivedAt: "2026-09-20T00:00:00.000Z",
      blacklistedAt: "2026-09-21T00:00:00.000Z",
      blacklistReason: null,
    };
    return Promise.resolve(
      new Response(
        JSON.stringify({
          data: {
            application,
            events: [],
            preparation: { companyResearch: null, talkingPoints: null, interviewerQuestions: null, updatedAt: null },
            contacts: [],
            followUpTasks: [],
          },
        }),
        { status: 200 },
      ),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  renderPage("/applications/7");
  await userEvent.setup().click(await screen.findByRole("button", { name: "Restore application" }));
  await waitFor(() => expect(screen.getByTestId("pathname")).toHaveTextContent("/archive"));
  expect(fetcher).toHaveBeenCalledWith("/api/applications/7/unblacklist", expect.anything());
});

function renderPage(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(authKeys.me, { data: { user: { id: 1, email: "test@example.com" } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter initialEntries={[path]}>
          <LocationProbe />
          <Routes>
            <Route path="/applications/:id" element={<ApplicationWorkspacePage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="pathname">{location.pathname}</output>;
}

afterEach(() => vi.unstubAllGlobals());
