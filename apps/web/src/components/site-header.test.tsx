import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { store } from "../store";
import { initializeTestI18n } from "../test/initialize-test-i18n";
import { SiteHeader } from "./site-header.tsx";

const mockCurrentUser = vi.fn();

vi.mock("../features/preferences/language-selector.tsx", () => ({ LanguageSelector: () => null }));
vi.mock("../features/preferences/theme-selector.tsx", () => ({ ThemeSelector: () => null }));
vi.mock("../lib/queries", () => ({
  useAuthMutations: () => ({ logout: { mutateAsync: vi.fn(), isPending: false } }),
  useCurrentUser: () => mockCurrentUser(),
}));

beforeEach(async () => {
  await initializeTestI18n();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("announces disconnection on the settings link without visible text", () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const user = { id: 1, email: "candidate@example.com" };
  mockCurrentUser.mockReturnValue({ data: user, isPending: false });
  const client = new QueryClient();
  client.setQueryData(["auth", "me"], { data: { user } });
  render(
    <QueryClientProvider client={client}>
      <Provider store={store}>
        <MemoryRouter>
          <SiteHeader />
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
  const settings = screen.getByRole("link", { name: "Settings — Offline or server unavailable" });
  expect(settings).toHaveAttribute("href", "/settings");
  expect(settings).toHaveAttribute("title", "Settings — Offline or server unavailable");
  expect(settings).toHaveTextContent("");
});

test("does not expose the export action in the signed-in header", () => {
  const user = { id: 1, email: "candidate@example.com" };
  mockCurrentUser.mockReturnValue({ data: user, isPending: false });
  const client = new QueryClient();
  client.setQueryData(["auth", "me"], { data: { user } });
  render(
    <QueryClientProvider client={client}>
      <Provider store={store}>
        <MemoryRouter>
          <SiteHeader />
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
  expect(screen.queryByRole("button", { name: "Export package" })).toBeNull();
});

test("shows a login link after a signed-out session resolves", () => {
  mockCurrentUser.mockReturnValue({ data: null, isPending: false });
  renderHeader();

  expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
});

test("exposes an icon-only settings link while signed in", () => {
  mockCurrentUser.mockReturnValue({ data: { id: 1, email: "candidate@example.com" }, isPending: false });
  renderHeader();

  const settings = screen.getByRole("link", { name: "Settings" });
  expect(settings).toHaveAttribute("href", "/settings");
  expect(settings).toHaveAttribute("title", "Settings");
  expect(settings).toHaveTextContent("");
});

test.each([
  { data: null, isPending: false },
  { data: undefined, isPending: true },
])("hides settings without an account (pending: $isPending)", (user) => {
  mockCurrentUser.mockReturnValue(user);
  renderHeader();
  expect(screen.queryByRole("link", { name: /^Settings/ })).toBeNull();
});

test("does not show a login link while loading or authenticated", () => {
  mockCurrentUser.mockReturnValue({ data: undefined, isPending: true });
  const { rerender } = renderHeader();
  expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();

  mockCurrentUser.mockReturnValue({ data: { id: 1, email: "candidate@example.com" }, isPending: false });
  rerender(
    <Provider store={store}>
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    </Provider>,
  );
  expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
});

function renderHeader() {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>
    </Provider>,
  );
}
