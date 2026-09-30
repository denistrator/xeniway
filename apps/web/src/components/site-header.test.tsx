import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { store } from "../store";
import { initializeTestI18n } from "../test/initialize-test-i18n";
import { SiteHeader } from "./site-header";

const mockCurrentUser = vi.fn();

vi.mock("../features/data-export/csv-export-button", () => ({ CsvExportButton: () => null }));
vi.mock("../features/preferences/language-selector", () => ({ LanguageSelector: () => null }));
vi.mock("../features/preferences/theme-selector", () => ({ ThemeSelector: () => null }));
vi.mock("../lib/queries", () => ({
  useAuthMutations: () => ({ logout: { mutateAsync: vi.fn(), isPending: false } }),
  useCurrentUser: () => mockCurrentUser(),
}));

beforeEach(async () => {
  await initializeTestI18n();
});

test("shows a login link after a signed-out session resolves", () => {
  mockCurrentUser.mockReturnValue({ data: null, isPending: false });
  renderHeader();

  expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
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
