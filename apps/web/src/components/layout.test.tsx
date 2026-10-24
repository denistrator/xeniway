import { QueryClient, QueryClientProvider, type UseMutationResult } from "@tanstack/react-query";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CreateApplicationInput } from "@xeniway/shared";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { OfflineContext } from "../features/offline/offline-access.model";
import { createAccessState, selectAccess } from "../features/offline/offline-access-machine";
import { createOfflineAccessRuntime } from "../features/offline/offline-access-runtime";
import { closeDrawer, closeWelcome, openCreateDrawer, store } from "../store";
import { initializeTestI18n } from "../test/initialize-test-i18n";
import { Layout } from "./layout.view";

const mocks = vi.hoisted(() => {
  let resolveHostLoaded: () => void = () => undefined;
  const hostLoaded = new Promise<void>((resolve) => {
    resolveHostLoaded = resolve;
  });
  return {
    currentUser: vi.fn(),
    mutationHook: vi.fn(),
    create: vi.fn(),
    createMutation: null as UseMutationResult<unknown, Error, CreateApplicationInput> | null,
    hostLoaded,
    resolveHostLoaded,
    hostReady: Promise.resolve(),
    hostImport: vi.fn(),
  };
});

vi.mock("./site-header.view", () => ({ SiteHeader: () => null }));
vi.mock("../features/applications/form/job-manager-host.view", async (importOriginal) => {
  mocks.hostImport();
  await mocks.hostReady;
  const module = await importOriginal<typeof import("../features/applications/form/job-manager-host.view")>();
  mocks.resolveHostLoaded();
  return module;
});
vi.mock("../lib/queries", async () => {
  const { useMutation } = await import("@tanstack/react-query");
  return {
    useCurrentUser: () => mocks.currentUser(),
    useUserPreferences: () => ({ data: undefined, isPending: false, error: null }),
    useCompleteIntroduction: () => ({ mutate: vi.fn() }),
    useUpdateUserPreferences: () => ({ mutate: vi.fn() }),
    useApplicationMutations: () => {
      mocks.mutationHook();
      const create = useMutation<unknown, Error, CreateApplicationInput>({ mutationFn: mocks.create });
      mocks.createMutation = create;
      return { create };
    },
  };
});

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.createMutation = null;
  mocks.currentUser.mockReturnValue({ data: { id: 1, email: "candidate@example.com" }, isPending: false });
  store.dispatch(closeDrawer());
  store.dispatch(closeWelcome());
  await initializeTestI18n();
});

test.each(["/", "/applications/3"])(
  "read-only %s explains disabled tasks with one Settings recovery link",
  async (path) => {
    const client = new QueryClient();
    const runtime = createOfflineAccessRuntime(client);
    const access = { ...runtime, ...selectAccess(createAccessState({ online: false, userId: 1 }), Date.now()) };
    const router = createMemoryRouter(
      [
        {
          element: <Layout />,
          children: [
            {
              path,
              element: (
                <>
                  <p>Readable application content</p>
                  <button type="button" disabled>
                    Save task
                  </button>
                </>
              ),
            },
          ],
        },
      ],
      { initialEntries: [path] },
    );
    render(
      <QueryClientProvider client={client}>
        <Provider store={store}>
          <OfflineContext.Provider value={access}>
            <RouterProvider router={router} />
          </OfflineContext.Provider>
        </Provider>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "You are offline. Changes are unavailable until your connection is confirmed.",
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("button", { name: "Save task" })).toBeDisabled();
    expect(screen.getByText("Readable application content")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove offline data" })).not.toBeInTheDocument();
    client.clear();
  },
);

test("does not mount the form host before the first authenticated open", async () => {
  let releaseHostImport: () => void = () => undefined;
  mocks.hostReady = new Promise<void>((resolve) => {
    releaseHostImport = resolve;
  });
  renderLayout();
  await settleImports();

  expect(mocks.hostImport).not.toHaveBeenCalled();
  expect(mocks.mutationHook).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();

  try {
    act(() => store.dispatch(openCreateDrawer()));
    await vi.waitFor(() => expect(mocks.hostImport).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.mutationHook).not.toHaveBeenCalled();
  } finally {
    releaseHostImport();
  }
  await settleHost();
  expect(screen.getByRole("dialog")).toBeVisible();
});

test("keeps a rejected create inside its dialog with the entered draft", async () => {
  const user = userEvent.setup();
  mocks.create.mockRejectedValue(new Error("Creation failed"));
  renderLayout();
  act(() => store.dispatch(openCreateDrawer()));
  await settleHost();
  const dialog = screen.getByRole("dialog");
  await user.type(within(dialog).getByLabelText(/Company/), "Example");
  await user.type(within(dialog).getByLabelText(/Position/), "Engineer");
  await user.click(within(dialog).getByRole("button", { name: "Save application" }));

  expect(await within(dialog).findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
  expect(within(dialog).getByLabelText(/Company/)).toHaveValue("Example");
  expect(within(dialog).getByLabelText(/Position/)).toHaveValue("Engineer");
  expect(within(dialog).getByRole("button", { name: "Save application" })).toBeEnabled();
});

test("resets retained host state on account changes and logout", async () => {
  const view = renderLayout();
  act(() => store.dispatch(openCreateDrawer()));
  await settleHost();
  expect(screen.getByRole("dialog")).toBeVisible();
  act(() => store.dispatch(closeDrawer()));

  mocks.mutationHook.mockClear();
  mocks.currentUser.mockReturnValue({ data: { id: 2, email: "other@example.com" }, isPending: false });
  view.rerenderLayout();
  await settleImports();
  expect(mocks.mutationHook).not.toHaveBeenCalled();
  act(() => store.dispatch(openCreateDrawer()));
  await screen.findByRole("dialog");

  mocks.currentUser.mockReturnValue({ data: null, isPending: false });
  view.rerenderLayout();
  expect(screen.queryByRole("dialog")).toBeNull();
  act(() => store.dispatch(closeDrawer()));
  mocks.mutationHook.mockClear();
  mocks.currentUser.mockReturnValue({ data: { id: 2, email: "other@example.com" }, isPending: false });
  view.rerenderLayout();
  await settleImports();
  expect(mocks.mutationHook).not.toHaveBeenCalled();
});

test("does not mount a form for unresolved or signed-out authentication even with an open flag", async () => {
  mocks.currentUser.mockReturnValue({ data: undefined, isPending: true });
  act(() => store.dispatch(openCreateDrawer()));
  const view = renderLayout();
  await settleImports();
  expect(mocks.mutationHook).not.toHaveBeenCalled();
  mocks.currentUser.mockReturnValue({ data: null, isPending: false });
  view.rerenderLayout();
  expect(screen.queryByRole("dialog")).toBeNull();
});

function renderLayout() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  function element() {
    const router = createMemoryRouter([{ path: "*", element: <Layout /> }]);
    return (
      <StrictMode>
        <QueryClientProvider client={client}>
          <Provider store={store}>
            <RouterProvider router={router} />
          </Provider>
        </QueryClientProvider>
      </StrictMode>
    );
  }
  const view = render(element());
  return { ...view, rerenderLayout: () => view.rerender(element()) };
}

async function settleImports() {
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

async function settleHost() {
  await act(async () => {
    await mocks.hostLoaded;
  });
}
