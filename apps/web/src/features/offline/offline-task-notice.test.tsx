import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { changeLocale } from "../../i18n/i18n";
import { en } from "../../i18n/locales/en";
import he from "../../i18n/locales/he";
import ru from "../../i18n/locales/ru";
import uk from "../../i18n/locales/uk";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import { OfflineContext } from "./offline-access.model";
import { type AccessState, createAccessState, selectAccess, transitionAccess } from "./offline-access-machine";
import { createOfflineAccessRuntime } from "./offline-access-runtime";
import { OfflineTaskNotice } from "./offline-task-notice.view";

beforeEach(async () => {
  await initializeTestI18n();
});

afterEach(() => vi.useRealTimers());

function renderNotice(state: AccessState, path = "/applications/3") {
  const client = new QueryClient();
  const runtime = createOfflineAccessRuntime(client);
  const content = (next: AccessState) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <OfflineContext.Provider value={{ ...runtime, ...selectAccess(next, Date.now()) }}>
          <OfflineTaskNotice />
        </OfflineContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(content(state));
  return { update: (next: AccessState) => view.rerender(content(next)) };
}

test.each(["/settings", "/about", "/login", "/register"])("does not duplicate task recovery on %s", (path) => {
  renderNotice(createAccessState({ online: false, userId: 1 }), path);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("ordinary writable task content has no empty live region", () => {
  renderNotice(createAccessState({ online: true, userId: 1 }));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test.each(["/ARCHIVE/", "/Archive", "/blacklist/", "/BLACKLIST/", "/APPLICATIONS/3", "/Applications/3/"])(
  "task context follows the router's case-insensitive and trailing-slash match for %s",
  (path) => {
    renderNotice(createAccessState({ online: false, userId: 1 }), path);
    expect(screen.getByRole("status")).toHaveTextContent(en.offline.readOnlyOffline);
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  },
);

test.each([
  ["en", en],
  ["ru", ru],
  ["uk", uk],
  ["he", he],
] as const)("localizes the short reason and Settings link in %s", async (locale, dictionary) => {
  await changeLocale(locale);
  renderNotice(createAccessState({ online: false, userId: 1 }));
  expect(screen.getByRole("status")).toHaveTextContent(dictionary.offline.readOnlyOffline);
  expect(screen.getByRole("link", { name: dictionary.navigation.settings })).toHaveAttribute("href", "/settings");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("task context follows checking, failure, recovery and a newer sign-in without carrying old feedback", () => {
  let state = createAccessState({ online: false, userId: 1 });
  const view = renderNotice(state);
  expect(screen.getByRole("status")).toHaveTextContent(en.offline.readOnlyOffline);
  state = transitionAccess(state, { type: "VERIFY_STARTED", operation: 1 });
  view.update(state);
  expect(screen.getByRole("status")).toHaveTextContent(en.offline.checkingConnection);
  state = transitionAccess(state, { type: "VERIFY_FAILED", operation: 1, online: true });
  view.update(state);
  expect(screen.getByRole("status")).toHaveTextContent(en.offline.connectionFailed);
  state = transitionAccess(state, { type: "VERIFY_STARTED", operation: 2 });
  state = transitionAccess(state, { type: "VERIFY_SUCCEEDED", operation: 2, userId: 1 });
  view.update(state);
  expect(screen.getByRole("status")).toHaveTextContent(en.offline.connectionConfirmed);
  state = transitionAccess(state, { type: "SIGN_IN_SUCCEEDED", online: true, userId: 2 });
  view.update(state);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("server unavailability and a rejected session have distinct task recovery explanations", () => {
  let state = createAccessState({ online: true, userId: 1 });
  state = transitionAccess(state, { type: "SERVER_UNAVAILABLE" });
  const view = renderNotice(state);
  expect(screen.getByRole("status")).toHaveTextContent(en.offline.readOnlyUnavailable);
  state = transitionAccess(state, { type: "SESSION_REJECTED" });
  view.update(state);
  expect(screen.getByRole("status")).toHaveTextContent(en.offline.readOnlySession);
});

test("confirmed connection feedback expires without changing access or restarting on unrelated updates", () => {
  vi.useFakeTimers();
  let state = createAccessState({ online: true, userId: 1 });
  state = transitionAccess(state, { type: "VERIFY_STARTED", operation: 1 });
  state = transitionAccess(state, { type: "VERIFY_SUCCEEDED", operation: 1, userId: 1 });
  const view = renderNotice(state);
  act(() => vi.advanceTimersByTime(9000));
  view.update({ ...state, updateAvailable: true });
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(selectAccess(state, Date.now()).canMutate).toBe(true);
  state = transitionAccess(state, { type: "VERIFY_STARTED", operation: 2 });
  state = transitionAccess(state, { type: "VERIFY_SUCCEEDED", operation: 2, userId: 1 });
  view.update(state);
  expect(screen.getByRole("status")).toHaveTextContent(en.offline.connectionConfirmed);
  act(() => vi.advanceTimersByTime(9999));
  expect(screen.getByRole("status")).toBeVisible();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("offline, pending and failed checks remain visible beyond the info timeout", () => {
  vi.useFakeTimers();
  let state = createAccessState({ online: false, userId: 1 });
  const view = renderNotice(state);
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("status")).toHaveTextContent(en.offline.readOnlyOffline);
  state = transitionAccess(state, { type: "VERIFY_STARTED", operation: 1 });
  view.update(state);
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("status")).toHaveTextContent(en.offline.checkingConnection);
  state = transitionAccess(state, { type: "VERIFY_FAILED", operation: 1, online: true });
  view.update(state);
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("status")).toHaveTextContent(en.offline.connectionFailed);
});
