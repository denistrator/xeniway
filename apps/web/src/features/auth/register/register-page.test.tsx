import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initializeI18n } from "../../../i18n/i18n";
import { RegisterPage } from "./register-page.view";

const register = vi.fn();

vi.mock("../../../lib/queries", () => ({
  useCsrfToken: () => ({ isPending: false }),
  useAuthMutations: () => ({
    register: { error: null, isPending: false, mutateAsync: register },
  }),
}));

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

function submitRegistration() {
  const submitButton = screen.getByRole("button", { name: "Create account" });
  const form = submitButton.closest("form");

  if (!form) {
    throw new Error("Registration form was not rendered.");
  }

  fireEvent.submit(form);
}

describe("register page", () => {
  beforeEach(async () => {
    await initializeI18n();
    register.mockReset();
  });

  it("identifies a seven-character password and focuses its field", async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText("Email"), "candidate@example.com");
    await user.type(screen.getByLabelText("Password"), "shorter");
    await user.type(screen.getByLabelText("Confirm password"), "shorter");
    submitRegistration();

    const password = screen.getByLabelText("Password");
    const email = screen.getByLabelText("Email");
    expect(await screen.findByRole("alert")).toHaveTextContent("Use at least 8 characters.");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password.getAttribute("aria-describedby")).toContain("register-password-error");
    expect(email).toBeRequired();
    expect(email).toHaveAttribute("type", "email");
    expect(password).toHaveAttribute("autocomplete", "new-password");
    expect(password).toHaveFocus();
    expect(register).not.toHaveBeenCalled();
  });

  it("reports over-limit values and clears an error when the field is corrected", async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    const firstName = screen.getByLabelText("First name");
    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");
    const confirmation = screen.getByLabelText("Confirm password");
    await user.type(firstName, "a".repeat(101));
    await user.type(email, "candidate@example.com");
    await user.type(password, "password123");
    await user.type(confirmation, "password123");
    submitRegistration();

    expect(await screen.findByText("Use 100 characters or fewer.")).toBeVisible();
    expect(firstName).toHaveAttribute("aria-invalid", "true");
    expect(firstName).toHaveFocus();

    await user.clear(firstName);
    await user.type(firstName, "Ari");

    expect(firstName).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("Use 100 characters or fewer.")).not.toBeInTheDocument();
  });

  it("keeps password confirmation errors specific to the confirmation field", async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText("Email"), "candidate@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "another-password");
    submitRegistration();

    const confirmation = screen.getByLabelText("Confirm password");
    expect(await screen.findByText("Passwords must match")).toBeVisible();
    expect(confirmation).toHaveAttribute("aria-invalid", "true");
    expect(confirmation).toHaveFocus();
  });
});
