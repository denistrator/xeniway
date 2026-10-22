import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { createMemoryRouter, Link, Outlet, RouterProvider } from "react-router-dom";
import { expect, test } from "vitest";
import { DirtyEditorsProvider, useDirtyEditor } from "../lib/dirty-editors";
import { initializeTestI18n } from "../test/initialize-test-i18n";
import { DirtyDeparture } from "./dirty-departure.view";

function TestEditor() {
  const [dirty, setDirty] = useState(false);
  useDirtyEditor({ id: "editor", dirty, pending: false, discard: () => setDirty(false) });

  return (
    <>
      <button type="button" onClick={() => setDirty(true)}>
        Edit
      </button>
      <Link to="/next">Next</Link>
    </>
  );
}

function TestLayout() {
  return (
    <DirtyEditorsProvider>
      <DirtyDeparture />
      <Outlet />
    </DirtyEditorsProvider>
  );
}

test("keeps dirty work until the user explicitly discards it before navigation", async () => {
  await initializeTestI18n();
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        element: <TestLayout />,
        children: [
          { index: true, element: <TestEditor /> },
          { path: "/next", element: <p>Next page</p> },
        ],
      },
    ],
    { initialEntries: ["/"] },
  );

  render(<RouterProvider router={router} />);
  await user.click(screen.getByRole("button", { name: "Edit" }));
  await user.click(screen.getByRole("link", { name: "Next" }));

  const dialog = await screen.findByRole("alertdialog");
  expect(dialog).toBeVisible();
  await user.click(within(dialog).getByRole("button", { name: "Keep editing" }));
  expect(router.state.location.pathname).toBe("/");

  await user.click(screen.getByRole("link", { name: "Next" }));
  await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Discard changes" }));
  expect(await screen.findByText("Next page")).toBeVisible();
});
