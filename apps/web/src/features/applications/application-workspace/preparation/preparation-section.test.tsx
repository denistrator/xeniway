import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { initializeTestI18n } from "../../../../test/initialize-test-i18n";
import { workspacePreparation } from "../test-support/application-workspace-fixtures";
import { renderApplicationWorkspace } from "../test-support/render-application-workspace";

beforeEach(async () => {
  vi.restoreAllMocks();
  await initializeTestI18n();
});

afterEach(() => vi.unstubAllGlobals());

test("preparation saves only the edited field and cancel restores its previous value", async () => {
  const user = userEvent.setup();
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ data: { preparation: workspacePreparation } }), { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  renderApplicationWorkspace({ preparation: workspacePreparation });

  await user.click(screen.getByRole("button", { name: "Company research, Edit" }));
  const research = screen.getByRole("textbox", { name: "Company research" });
  expect(document.activeElement).toBe(research);
  await user.clear(research);
  await user.type(research, "New research");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Company research, Edit" }));
  expect(screen.getByText("Existing research")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Talking points, Edit" }));
  await user.type(screen.getByRole("textbox", { name: "Talking points" }), "Ask about growth");
  await user.click(screen.getByRole("button", { name: "Save talking points" }));
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Talking points, Edit" })),
  );
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ talkingPoints: "Ask about growth" });
  expect(screen.getByText("Ask about growth")).toBeVisible();
});

test("preparation editors keep independent drafts when another field is saved", async () => {
  const user = userEvent.setup();
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ data: { preparation: workspacePreparation } })));
  vi.stubGlobal("fetch", fetcher);
  renderApplicationWorkspace({ preparation: workspacePreparation });

  await user.click(screen.getByRole("button", { name: "Company research, Edit" }));
  await user.type(screen.getByRole("textbox", { name: "Company research" }), " draft");
  await user.click(screen.getByRole("button", { name: "Talking points, Edit" }));
  await user.type(screen.getByRole("textbox", { name: "Talking points" }), "Ask about growth");
  await user.click(screen.getByRole("button", { name: "Save talking points" }));

  await waitFor(() => expect(screen.getByRole("button", { name: "Talking points, Edit" })).toHaveFocus());
  expect(screen.getByRole("textbox", { name: "Company research" })).toHaveValue("Existing research draft");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ talkingPoints: "Ask about growth" });
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByText("Existing research")).toBeVisible();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test("preparation announces pending and failed saves without losing the draft", async () => {
  const user = userEvent.setup();
  let reject!: (error: Error) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    ),
  );
  renderApplicationWorkspace({ preparation: workspacePreparation });
  await user.click(screen.getByRole("button", { name: "Company research, Edit" }));
  await user.type(screen.getByRole("textbox", { name: "Company research" }), " update");
  await user.click(screen.getByRole("button", { name: "Save company research" }));
  expect(screen.getByText("Saving…")).toBeVisible();
  reject(new Error("offline"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not save company research.");
  expect(screen.getByRole("alert")).toHaveClass("text-rose-600");
  expect(screen.getByRole("textbox", { name: "Company research" })).toHaveValue("Existing research update");
});
