import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ApplicationDetailResponse, UserPreferences, UserPreferencesResponse } from "@xeniway/shared";
import { Provider } from "react-redux";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { store } from "../store";
import {
  applicationKeys,
  completeApplicationFollowUpTask,
  createApplicationContact,
  createApplicationFollowUpTask,
  deleteApplicationContact,
  deleteApplicationFollowUpTask,
  updateApplicationContact,
  updateApplicationFollowUpTask,
  updateApplicationPreparation,
  userPreferencesKeys,
} from "./api";
import {
  authKeys,
  useApplicationContactMutations,
  useApplicationDetail,
  useApplicationFollowUpMutations,
  useApplicationPreparationMutation,
  useAuthMutations,
  useUpdateUserPreferences,
  useUserPreferences,
} from "./queries";
import { userPreferencesStorageKey } from "./user-preferences";

const { getUserPreferences, logout, updateUserPreferences } = vi.hoisted(() => ({
  getUserPreferences: vi.fn(),
  logout: vi.fn(),
  updateUserPreferences: vi.fn(),
}));

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, getUserPreferences, logout, updateUserPreferences };
});

const accountA = { id: 1, email: "a@example.com" };
const accountB = { id: 2, email: "b@example.com" };
const response = (selectedTheme: UserPreferences["selectedTheme"]): UserPreferencesResponse => ({
  data: {
    preferences: {
      wasIntroduced: false,
      selectedLanguage: null,
      selectedTheme,
      selectedFormPresentation: null,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  },
});

function setup(user = accountA) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(authKeys.me, { data: { user } });
  queryClient.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
  return { queryClient, wrapper };
}

beforeEach(() => {
  getUserPreferences.mockReset();
  logout.mockReset();
  updateUserPreferences.mockReset();
});

afterEach(() => vi.unstubAllGlobals());

test("removes all user preference cache entries after successful logout", async () => {
  logout.mockResolvedValue({ data: { message: "Logged out" } });
  const { queryClient, wrapper } = setup();
  const localPreferences = JSON.stringify({ theme: "dark", language: "uk", wasIntroduced: true });
  window.localStorage.setItem(userPreferencesStorageKey, localPreferences);
  queryClient.setQueryData(userPreferencesKeys.current(accountA.id), response("dark"));
  queryClient.setQueryData(userPreferencesKeys.current(accountB.id), response("light"));

  const { result } = renderHook(() => useAuthMutations(), { wrapper });
  result.current.logout.mutate();

  await waitFor(() => expect(result.current.logout.isSuccess).toBe(true));

  expect(queryClient.getQueryData(userPreferencesKeys.current(accountA.id))).toBeUndefined();
  expect(queryClient.getQueryData(userPreferencesKeys.current(accountB.id))).toBeUndefined();
  expect(window.localStorage.getItem(userPreferencesStorageKey)).toBe(localPreferences);
});

test("keeps a late account A preferences response out of account B state", async () => {
  let resolveA!: (value: ReturnType<typeof response>) => void;
  getUserPreferences.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveA = resolve;
    }),
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  const accountAResult = renderHook(() => useUserPreferences(1), { wrapper });
  await waitFor(() => expect(getUserPreferences).toHaveBeenCalledTimes(1));
  getUserPreferences.mockResolvedValueOnce({
    data: {
      preferences: {
        ...response("light").data.preferences,
        selectedLanguage: "en",
        wasIntroduced: true,
      },
    },
  });
  const accountBResult = renderHook(() => useUserPreferences(2), { wrapper });
  await waitFor(() => expect(accountBResult.result.current.data?.selectedTheme).toBe("light"));

  resolveA({
    data: {
      preferences: {
        ...response("dark").data.preferences,
        selectedLanguage: "ru",
        wasIntroduced: false,
      },
    },
  });
  await waitFor(() => expect(accountAResult.result.current.data?.selectedTheme).toBe("dark"));

  expect(queryClient.getQueryData(userPreferencesKeys.current(2))).toEqual({
    data: {
      preferences: {
        ...response("light").data.preferences,
        selectedLanguage: "en",
        wasIntroduced: true,
      },
    },
  });
});

test("starts rapid preference updates independently", async () => {
  updateUserPreferences.mockResolvedValue(response("dark"));
  const { queryClient, wrapper } = setup();
  queryClient.setQueryData(userPreferencesKeys.current(accountA.id), response("light"));
  const { result } = renderHook(() => useUpdateUserPreferences(), { wrapper });

  result.current.mutate({ selectedTheme: "dark" });
  result.current.mutate({ selectedTheme: "light" });

  await waitFor(() => expect(updateUserPreferences).toHaveBeenCalledTimes(2));
  expect(queryClient.getQueryData(userPreferencesKeys.current(accountA.id))).toEqual(response("light"));
});

test("aborts an in-flight preference update when the account changes", async () => {
  updateUserPreferences.mockReturnValue(new Promise(() => {}));
  const { queryClient, wrapper } = setup(accountA);
  const { result, rerender } = renderHook(() => useUpdateUserPreferences(), { wrapper });

  result.current.mutate({ selectedTheme: "dark" });
  await waitFor(() => expect(updateUserPreferences).toHaveBeenCalledTimes(1));
  const request = updateUserPreferences.mock.calls[0]?.[2];
  expect(request).toBeInstanceOf(AbortSignal);

  queryClient.setQueryData(authKeys.me, { data: { user: accountB } });
  rerender();

  expect(request.aborted).toBe(true);
});

test("ignores a late failure after switching accounts", async () => {
  let rejectRequest!: (error: Error) => void;
  updateUserPreferences.mockReturnValue(
    new Promise((_resolve, reject) => {
      rejectRequest = reject;
    }),
  );
  const { queryClient, wrapper } = setup(accountB);
  const { result } = renderHook(() => useUpdateUserPreferences(), { wrapper });

  result.current.mutate({ selectedTheme: "dark" });
  await waitFor(() => expect(updateUserPreferences).toHaveBeenCalledTimes(1));
  queryClient.setQueryData(authKeys.me, { data: { user: accountA } });
  rejectRequest(new Error("offline"));

  await waitFor(() => expect(result.current.isError).toBe(true));
});

test("ignores a late success after switching accounts", async () => {
  let resolveRequest!: (value: ReturnType<typeof response>) => void;
  updateUserPreferences.mockReturnValue(
    new Promise((resolve) => {
      resolveRequest = resolve;
    }),
  );
  const { queryClient, wrapper } = setup();
  queryClient.setQueryData(userPreferencesKeys.current(accountA.id), response("light"));
  const { result } = renderHook(() => useUpdateUserPreferences(), { wrapper });

  result.current.mutate({ selectedTheme: "dark" });
  await waitFor(() => expect(updateUserPreferences).toHaveBeenCalledTimes(1));
  queryClient.setQueryData(authKeys.me, { data: { user: accountB } });
  resolveRequest(response("dark"));

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(queryClient.getQueryData(userPreferencesKeys.current(accountA.id))).toEqual(response("light"));
});

test("ignores a late response after leaving and returning to the same account", async () => {
  let resolveRequest!: (value: ReturnType<typeof response>) => void;
  updateUserPreferences.mockReturnValue(
    new Promise((resolve) => {
      resolveRequest = resolve;
    }),
  );
  const { queryClient, wrapper } = setup();
  queryClient.setQueryData(userPreferencesKeys.current(accountA.id), response("light"));
  const { result } = renderHook(() => useUpdateUserPreferences(), { wrapper });

  result.current.mutate({ selectedTheme: "dark" });
  await waitFor(() => expect(updateUserPreferences).toHaveBeenCalledTimes(1));
  queryClient.setQueryData(authKeys.me, { data: { user: accountB } });
  queryClient.setQueryData(authKeys.me, { data: { user: accountA } });
  resolveRequest(response("dark"));

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(queryClient.getQueryData(userPreferencesKeys.current(accountA.id))).toEqual(response("light"));
});

test("ignores a late failure after leaving and returning to the same account", async () => {
  let rejectRequest!: (error: Error) => void;
  updateUserPreferences.mockReturnValue(
    new Promise((_resolve, reject) => {
      rejectRequest = reject;
    }),
  );
  const { queryClient, wrapper } = setup();
  const { result } = renderHook(() => useUpdateUserPreferences(), { wrapper });

  result.current.mutate({ selectedTheme: "dark" });
  await waitFor(() => expect(updateUserPreferences).toHaveBeenCalledTimes(1));
  queryClient.setQueryData(authKeys.me, { data: { user: accountB } });
  queryClient.setQueryData(authKeys.me, { data: { user: accountA } });
  rejectRequest(new Error("offline"));

  await waitFor(() => expect(result.current.isError).toBe(true));
});

const applicationId = 42;
const contactId = 7;
const taskId = 8;
const contactInput = { name: "Alex", role: "Recruiter", email: "alex@example.com" };
const taskInput = { title: "Send portfolio", dueDate: "2026-10-01", notes: null };

test.each([
  {
    name: "preparation update",
    call: () => updateApplicationPreparation(applicationId, { companyResearch: "Research" }, "csrf"),
    path: `/api/applications/${applicationId}/preparation`,
    method: "PUT",
    body: { companyResearch: "Research" },
  },
  {
    name: "contact creation",
    call: () => createApplicationContact(applicationId, contactInput, "csrf"),
    path: `/api/applications/${applicationId}/contacts`,
    method: "POST",
    body: contactInput,
  },
  {
    name: "contact update",
    call: () => updateApplicationContact(applicationId, contactId, { phone: "+123" }, "csrf"),
    path: `/api/applications/${applicationId}/contacts/${contactId}`,
    method: "PATCH",
    body: { phone: "+123" },
  },
  {
    name: "contact deletion",
    call: () => deleteApplicationContact(applicationId, contactId, "csrf"),
    path: `/api/applications/${applicationId}/contacts/${contactId}`,
    method: "DELETE",
    body: undefined,
  },
  {
    name: "follow-up creation",
    call: () => createApplicationFollowUpTask(applicationId, taskInput, "csrf"),
    path: `/api/applications/${applicationId}/follow-ups`,
    method: "POST",
    body: taskInput,
  },
  {
    name: "follow-up update",
    call: () => updateApplicationFollowUpTask(applicationId, taskId, { dueDate: "2026-10-02" }, "csrf"),
    path: `/api/applications/${applicationId}/follow-ups/${taskId}`,
    method: "PATCH",
    body: { dueDate: "2026-10-02" },
  },
  {
    name: "follow-up completion",
    call: () => completeApplicationFollowUpTask(applicationId, taskId, "csrf"),
    path: `/api/applications/${applicationId}/follow-ups/${taskId}/complete`,
    method: "POST",
    body: undefined,
  },
  {
    name: "follow-up deletion",
    call: () => deleteApplicationFollowUpTask(applicationId, taskId, "csrf"),
    path: `/api/applications/${applicationId}/follow-ups/${taskId}`,
    method: "DELETE",
    body: undefined,
  },
])("sends $name with the expected path, method, body and CSRF token", async ({ call, path, method, body }) => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ data: { message: "ok" } }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  await call();

  expect(fetchMock).toHaveBeenCalledOnce();
  const [requestedPath, request] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(requestedPath).toBe(path);
  expect(request.method).toBe(method);
  expect(request.credentials).toBe("include");
  expect((request.headers as Headers).get("x-csrf-token")).toBe("csrf");
  expect((request.headers as Headers).get("content-type")).toBe(body === undefined ? null : "application/json");
  expect(request.body).toBe(body === undefined ? undefined : JSON.stringify(body));
});

test("selects application, activity, preparation, contacts and follow-ups from the detail response", async () => {
  const detail = {
    application: { id: applicationId },
    events: [{ id: 1 }],
    preparation: { companyResearch: "Research", talkingPoints: null, interviewerQuestions: null, updatedAt: null },
    contacts: [{ id: contactId }],
    followUpTasks: [{ id: taskId }],
  } as ApplicationDetailResponse["data"];
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: detail }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const { wrapper } = setup();

  const { result } = renderHook(() => useApplicationDetail(applicationId), { wrapper });

  await waitFor(() => expect(result.current.data).toEqual(detail));
  expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/applications/${applicationId}`);
});

test.each([
  {
    name: "preparation update",
    useAction: () => {
      const mutation = useApplicationPreparationMutation(applicationId);
      return () => mutation.mutate({ companyResearch: "Research" });
    },
  },
  {
    name: "contact creation",
    useAction: () => {
      const mutations = useApplicationContactMutations(applicationId);
      return () => mutations.create.mutate(contactInput);
    },
  },
  {
    name: "contact update",
    useAction: () => {
      const mutations = useApplicationContactMutations(applicationId);
      return () => mutations.update.mutate({ contactId, input: { role: "Hiring manager" } });
    },
  },
  {
    name: "contact deletion",
    useAction: () => {
      const mutations = useApplicationContactMutations(applicationId);
      return () => mutations.remove.mutate(contactId);
    },
  },
  {
    name: "follow-up creation",
    useAction: () => {
      const mutations = useApplicationFollowUpMutations(applicationId);
      return () => mutations.create.mutate(taskInput);
    },
  },
  {
    name: "follow-up update",
    useAction: () => {
      const mutations = useApplicationFollowUpMutations(applicationId);
      return () => mutations.update.mutate({ taskId, input: { title: "Follow up" } });
    },
  },
  {
    name: "follow-up completion",
    useAction: () => {
      const mutations = useApplicationFollowUpMutations(applicationId);
      return () => mutations.complete.mutate(taskId);
    },
  },
  {
    name: "follow-up deletion",
    useAction: () => {
      const mutations = useApplicationFollowUpMutations(applicationId);
      return () => mutations.remove.mutate(taskId);
    },
  },
])("invalidates only the matching detail after successful $name", async ({ useAction }) => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ data: { message: "ok" } }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const { queryClient, wrapper } = setup();
  queryClient.setQueryData(applicationKeys.detail(applicationId), { data: { application: { id: applicationId } } });
  queryClient.setQueryData(applicationKeys.detail(99), { data: { application: { id: 99 } } });
  queryClient.setQueryData(applicationKeys.list("active"), { data: { applications: [] } });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const { result } = renderHook(useAction, { wrapper });

  act(() => result.current());

  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: applicationKeys.detail(applicationId) }));
  expect(queryClient.getQueryState(applicationKeys.detail(applicationId))?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(applicationKeys.detail(99))?.isInvalidated).toBe(false);
  expect(queryClient.getQueryState(applicationKeys.list("active"))?.isInvalidated).toBe(false);
});
