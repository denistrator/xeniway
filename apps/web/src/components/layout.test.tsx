import { QueryClient, QueryClientProvider, type UseMutationResult } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CreateApplicationInput } from "@xeniway/shared";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
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

test("keeps pending and failed creation state when the dialog closes and reopens", async () => {
  let rejectCreation: (error: Error) => void = () => undefined;
  mocks.create.mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        rejectCreation = reject;
      }),
  );
  renderLayout();
  act(() => store.dispatch(openCreateDrawer()));
  await settleHost();
  expect(screen.getByRole("dialog")).toBeVisible();
  let creation: Promise<unknown> | undefined;
  act(() => {
    creation = mocks.createMutation?.mutateAsync({ company: "Example", position: "Engineer", status: "saved" });
    void creation?.catch(() => undefined);
  });
  await waitFor(() => expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled());
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).toBeNull();

  act(() => store.dispatch(openCreateDrawer()));
  expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled();
  await act(async () => {
    rejectCreation(new Error("Creation failed"));
    await creation?.catch(() => undefined);
  });
  await screen.findByText("Something went wrong. Please try again.");
  act(() => store.dispatch(closeDrawer()));
  expect(screen.getByText("Something went wrong. Please try again.")).toBeVisible();
  act(() => store.dispatch(openCreateDrawer()));
  expect(screen.getByText("Something went wrong. Please try again.")).toBeVisible();
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
  const element = () => (
    <StrictMode>
      <QueryClientProvider client={client}>
        <Provider store={store}>
          <MemoryRouter>
            <Layout />
          </MemoryRouter>
        </Provider>
      </QueryClientProvider>
    </StrictMode>
  );
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
