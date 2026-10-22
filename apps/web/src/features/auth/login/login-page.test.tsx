import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initializeI18n } from "../../../i18n/i18n";
import { LoginPage } from "./login-page.view";

const login = { error: null as Error | null, isPending: false, mutateAsync: vi.fn() };

vi.mock("../../../lib/queries", () => ({
  useCsrfToken: () => ({ isPending: false }),
  useAuthMutations: () => ({ login }),
}));

function LocationProbe() {
  const location = useLocation();
  return <p>{`${location.pathname}${location.search}${location.hash}`}</p>;
}

describe("login page", () => {
  beforeEach(async () => {
    await initializeI18n();
    login.error = null;
    login.mutateAsync.mockReset();
  });

  it("returns to a validated destination after sign in", async () => {
    login.mutateAsync.mockResolvedValue({ data: { user: { id: 1 } } });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login?returnTo=%2Fapplications%2F42%3Ftab%3Dactivity%23event-3"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/applications/:id" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Email"), "candidate@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("/applications/42?tab=activity#event-3")).toBeVisible();
    expect(login.mutateAsync).toHaveBeenCalledWith({ email: "candidate@example.com", password: "password123" });
  });

  it("keeps return intent when linking to registration", () => {
    render(
      <MemoryRouter initialEntries={["/login?returnTo=%2Farchive"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/register?returnTo=%2Farchive",
    );
  });
});
