import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeLocale, initializeI18n } from "../../../i18n/i18n";
import { ApiRequestError } from "../../../lib/api";
import { getResetToken, PasswordResetPage } from "./password-reset-page.view";

const confirm = { error: null as Error | null, isPending: false, mutateAsync: vi.fn() };

vi.mock("../../../lib/queries", () => ({
  useCsrfToken: () => ({ isPending: false }),
  usePasswordResetMutations: () => ({
    confirm,
  }),
}));

describe("password reset page", () => {
  beforeEach(async () => {
    await initializeI18n();
    await changeLocale("en");
    confirm.error = null;
    confirm.mutateAsync.mockReset();
  });

  it("reads the reset token from the URL search string", () => {
    expect(getResetToken("?token=abc123")).toBe("abc123");
    expect(getResetToken("?other=value")).toBeNull();
  });

  it("shows localized password validation after language selection", async () => {
    await changeLocale("uk");
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/reset-password?token=token"]}>
        <PasswordResetPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Новий пароль"), "long-enough");
    await user.type(screen.getByLabelText("Підтвердьте пароль"), "different-password");
    await user.click(screen.getByRole("button", { name: "Оновити пароль" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Паролі мають збігатися");
    expect(screen.getByRole("alert")).toHaveFocus();
  });

  it("offers a new reset link when the token is invalid", () => {
    confirm.error = new ApiRequestError("Invalid link", "PASSWORD_RESET_INVALID", 400);

    render(
      <MemoryRouter initialEntries={["/reset-password?token=token"]}>
        <PasswordResetPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Reset link unavailable" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute("href", "/forgot-password");
  });

  it("focuses the one announced success result after updating the password", async () => {
    confirm.mutateAsync.mockResolvedValue({ data: { message: "Password updated" } });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/reset-password?token=token"]}>
        <PasswordResetPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("New password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    const result = await screen.findByRole("status");
    expect(result).toHaveTextContent("Your password has been reset successfully.");
    expect(result).toHaveFocus();
    expect(screen.getByRole("link", { name: "Return to sign in" })).toHaveAttribute("href", "/login");
  });
});
