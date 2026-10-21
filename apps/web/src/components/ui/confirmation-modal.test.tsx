import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, StrictMode, useState } from "react";
import { expect, test, vi } from "vitest";
import { ConfirmationModal } from "./confirmation-modal.view";

const labels = {
  title: "Delete application?",
  text: "This cannot be undone.",
  yesLabel: "Delete application",
  noLabel: "Cancel",
};

function ConfirmationExample({ removeOpener = false }: { removeOpener?: boolean }) {
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState(false);

  function confirm() {
    setRemoved(removeOpener);
    setOpen(false);
  }

  return (
    <main id="main-content" tabIndex={-1}>
      {!removed && (
        <button type="button" onClick={() => setOpen(true)}>
          Open confirmation
        </button>
      )}
      {open && <ConfirmationModal {...labels} onNo={() => setOpen(false)} onYes={confirm} />}
    </main>
  );
}

test("wraps Tab and Shift+Tab inside the confirmation", async () => {
  const user = userEvent.setup();
  render(<ConfirmationModal {...labels} onNo={vi.fn()} onYes={vi.fn()} />);
  const dialog = within(screen.getByRole("alertdialog"));
  const cancel = dialog.getByRole("button", { name: "Cancel" });
  const confirm = dialog.getByRole("button", { name: "Delete application" });

  expect(cancel).toHaveFocus();
  await user.tab({ shift: true });
  expect(confirm).toHaveFocus();
  await user.tab();
  expect(cancel).toHaveFocus();
  await user.tab();
  expect(confirm).toHaveFocus();
});

test("keeps focus on Cancel while confirmation is disabled", async () => {
  const user = userEvent.setup();
  render(<ConfirmationModal {...labels} yesDisabled onNo={vi.fn()} onYes={vi.fn()} />);
  const cancel = within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" });

  await user.tab();
  expect(cancel).toHaveFocus();
  await user.tab({ shift: true });
  expect(cancel).toHaveFocus();
});

test.each(["Escape", "Cancel", "backdrop", "confirm"])("restores the opener after %s", async (action) => {
  const user = userEvent.setup();
  render(
    <StrictMode>
      <ConfirmationExample />
    </StrictMode>,
  );
  const opener = screen.getByRole("button", { name: "Open confirmation" });
  await user.click(opener);
  const dialog = within(screen.getByRole("alertdialog"));

  switch (action) {
    case "Escape": {
      await user.keyboard("{Escape}");
      break;
    }
    case "Cancel": {
      await user.click(dialog.getByRole("button", { name: "Cancel" }));
      break;
    }
    case "backdrop": {
      await user.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
      break;
    }
    default: {
      await user.click(dialog.getByRole("button", { name: "Delete application" }));
    }
  }

  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});

test("focuses the page when the opener was removed by confirmation", async () => {
  const user = userEvent.setup();
  render(<ConfirmationExample removeOpener />);
  await user.click(screen.getByRole("button", { name: "Open confirmation" }));
  await user.click(screen.getByRole("button", { name: "Delete application" }));

  expect(screen.getByRole("main")).toHaveFocus();
});

test("uses the page fallback when a replacement dialog opened from the document body", async () => {
  const { rerender } = render(
    <main id="main-content" tabIndex={-1}>
      <ConfirmationModal {...labels} onNo={vi.fn()} onYes={vi.fn()} />
    </main>,
  );
  rerender(<main id="main-content" tabIndex={-1} />);

  await vi.waitFor(() => expect(screen.getByRole("main")).toHaveFocus());
});

test("does not reset focus when a caller supplies a new dismissal callback", async () => {
  const user = userEvent.setup();
  const onNo = vi.fn();
  const { rerender } = render(<ConfirmationModal {...labels} onNo={vi.fn()} onYes={vi.fn()} />);
  const confirm = screen.getByRole("button", { name: "Delete application" });
  await user.click(confirm);
  rerender(<ConfirmationModal {...labels} onNo={onNo} onYes={vi.fn()} />);

  expect(confirm).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(onNo).toHaveBeenCalledOnce();
});

test.each([false, true])("honors the caller's focus destination after closing (disabled: %s)", async (disabled) => {
  const user = userEvent.setup();
  const returnFocusRef = createRef<HTMLButtonElement>();
  const { rerender } = render(
    <section aria-label="Activity" tabIndex={-1}>
      <button ref={returnFocusRef} type="button" disabled={disabled}>
        Add activity
      </button>
      <ConfirmationModal {...labels} onNo={vi.fn()} onYes={vi.fn()} returnFocusRef={returnFocusRef} />
    </section>,
  );
  await user.click(screen.getByRole("button", { name: "Delete application" }));
  rerender(
    <section aria-label="Activity" tabIndex={-1}>
      <button ref={returnFocusRef} type="button" disabled={disabled}>
        Add activity
      </button>
    </section>,
  );

  await vi.waitFor(() => {
    const target = disabled ? screen.getByRole("region", { name: "Activity" }) : returnFocusRef.current;
    expect(target).toHaveFocus();
  });
});

test("isolates background controls without disabling the dialog's ancestors", () => {
  const { unmount } = render(
    <main>
      <section aria-label="Already unavailable" inert />
      <button type="button">Background action</button>
      <ConfirmationModal {...labels} onNo={vi.fn()} onYes={vi.fn()} />
    </main>,
  );
  const background = screen.getByRole("button", { name: "Background action" });
  const previouslyInert = screen.getByLabelText("Already unavailable");
  const dialog = screen.getByRole("alertdialog");

  expect(background.closest("[inert]")).not.toBeNull();
  expect(dialog.closest("[inert]")).toBeNull();
  unmount();
  expect(background).not.toHaveAttribute("inert");
  expect(previouslyInert).toHaveAttribute("inert");
});

test("redirects attempted background focus into the dialog", () => {
  render(
    <>
      <button type="button">Background action</button>
      <ConfirmationModal {...labels} onNo={vi.fn()} onYes={vi.fn()} />
    </>,
  );
  screen.getByRole("button", { name: "Background action" }).focus();

  expect(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" })).toHaveFocus();
});

test("does not pass Escape through to a parent dialog", () => {
  const closeParent = vi.fn();
  const closeConfirmation = vi.fn();
  document.addEventListener("keydown", closeParent);
  try {
    render(<ConfirmationModal {...labels} onNo={closeConfirmation} onYes={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });

    expect(closeConfirmation).toHaveBeenCalledOnce();
    expect(closeParent).not.toHaveBeenCalled();
  } finally {
    document.removeEventListener("keydown", closeParent);
  }
});

test("does not steal focus from a replacement confirmation", async () => {
  const { rerender } = render(<ConfirmationModal key="first" {...labels} onNo={vi.fn()} onYes={vi.fn()} />);
  rerender(<ConfirmationModal key="second" {...labels} title="Replacement" onNo={vi.fn()} onYes={vi.fn()} />);

  await vi.waitFor(() => {
    expect(
      within(screen.getByRole("alertdialog", { name: "Replacement" })).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus();
  });
});

test("only the top confirmation handles Escape and keeps unique accessible names", async () => {
  const onNo = vi.fn();
  const onTopNo = vi.fn();
  const { rerender } = render(
    <>
      <ConfirmationModal {...labels} onNo={onNo} onYes={vi.fn()} />
      <ConfirmationModal {...labels} title="Second confirmation" onNo={onTopNo} onYes={vi.fn()} />
    </>,
  );
  const top = screen.getByRole("alertdialog", { name: "Second confirmation" });
  fireEvent.keyDown(top, { key: "Escape" });

  expect(onTopNo).toHaveBeenCalledOnce();
  expect(onNo).not.toHaveBeenCalled();
  rerender(<ConfirmationModal {...labels} onNo={onNo} onYes={vi.fn()} />);
  await vi.waitFor(() => {
    expect(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" })).toHaveFocus();
  });
});
