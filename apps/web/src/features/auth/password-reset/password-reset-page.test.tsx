import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { changeLocale, initializeI18n } from "../../../i18n/i18n";
import { getResetToken, PasswordResetPage } from "./password-reset-page";

vi.mock("../../../lib/queries", () => ({
  useCsrfToken: () => ({ isPending: false }),
  usePasswordResetMutations: () => ({
    confirm: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

describe("password reset page", () => {
  it("reads the reset token from the URL search string", () => {
    expect(getResetToken("?token=abc123")).toBe("abc123");
    expect(getResetToken("?other=value")).toBeNull();
  });

  it("shows localized password validation after language selection", async () => {
    await initializeI18n();
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
  });
});
