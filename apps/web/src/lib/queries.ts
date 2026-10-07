import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ApplicationDetailResponse,
  ApplicationEventInput,
  ApplicationListResponse,
  BlacklistInput,
  CreateApplicationContactInput,
  CreateApplicationFollowUpTaskInput,
  CreateApplicationInput,
  CurrentUserResponse,
  JobApplication,
  LoginInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  RegisterInput,
  UpdateApplicationContactInput,
  UpdateApplicationEventInput,
  UpdateApplicationFollowUpTaskInput,
  UpdateApplicationInput,
  UpdateApplicationPreparationInput,
  UpdateUserPreferencesInput,
} from "@xeniway/shared";
import { useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useOfflineAccess, useReadAccountId } from "../features/offline/offline-access";
import { OFFLINE_RETENTION_MS } from "../features/offline/offline-types";
import { useOwnerMutation } from "../features/offline/use-owner-mutation";
import { closeWelcome, openWelcome } from "../store";
import {
  type ApplicationList,
  applicationKeys,
  archiveApplication,
  blacklistApplication,
  completeApplicationFollowUpTask,
  confirmPasswordReset,
  createApplication,
  createApplicationContact,
  createApplicationEvent,
  createApplicationFollowUpTask,
  deleteApplication,
  deleteApplicationContact,
  deleteApplicationEvent,
  deleteApplicationFollowUpTask,
  exportApplicationsCsv,
  getApplicationDetail,
  getCsrfToken,
  getCurrentUser,
  getUserPreferences,
  listApplications,
  listArchivedApplications,
  listBlacklistedApplications,
  login,
  logout,
  markUserIntroduced,
  register,
  removeAllApplications,
  reorderApplications,
  requestPasswordReset,
  restoreApplication,
  unblacklistApplication,
  updateApplication,
  updateApplicationContact,
  updateApplicationEvent,
  updateApplicationFollowUpTask,
  updateApplicationPreparation,
  updateUserPreferences,
  userPreferencesKeys,
} from "./api";
import { writeLocalUserPreferences } from "./user-preferences";

export const authKeys = {
  me: ["auth", "me"] as const,
  csrf: ["auth", "csrf"] as const,
};

type CurrentUserQueryData = CurrentUserResponse | { data: { user: null } };

export function useCurrentUser() {
  return useQuery<CurrentUserQueryData, Error, CurrentUserQueryData["data"]["user"]>({
    queryKey: authKeys.me,
    queryFn: getCurrentUser,
    retry: false,
    retryOnMount: false,
    networkMode: "always",
    staleTime: 60_000,
    select: (response) => response.data.user,
  });
}

export function useCsrfToken() {
  return useQuery({
    queryKey: authKeys.csrf,
    queryFn: getCsrfToken,
    staleTime: 60 * 60 * 1000,
    enabled: navigator.onLine,
    select: (response) => response.data.csrfToken,
  });
}

export function useAuthMutations() {
  const access = useOfflineAccess();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data;

  const finishAuth = (response: Awaited<ReturnType<typeof login>>) => {
    // A session check started before sign-in must not replace the new response.
    void queryClient.cancelQueries({ queryKey: authKeys.me, exact: true });
    const previousId = queryClient.getQueryData<CurrentUserQueryData>(authKeys.me)?.data.user?.id;
    if (previousId !== response.data.user.id) {
      void queryClient.cancelQueries({ queryKey: applicationKeys.all });
      queryClient.removeQueries({ queryKey: applicationKeys.all });
    }
    queryClient.setQueryData(authKeys.me, { data: { user: response.data.user } });
    queryClient.setQueryData(authKeys.csrf, { data: { csrfToken: response.data.csrfToken } });
    access.confirmSignIn(response.data.user.id);
    queryClient.removeQueries({ queryKey: userPreferencesKeys.all });
    const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("xeniway-offline") : null;
    channel?.postMessage({ type: "session-changed", userId: response.data.user.id });
    channel?.close();
    dispatch(openWelcome());
  };

  return {
    login: useMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (input: LoginInput) => login(input, csrfToken ?? ""),
      onSuccess: finishAuth,
    }),
    register: useMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (input: RegisterInput) => register(input, csrfToken ?? ""),
      onSuccess: finishAuth,
    }),
    logout: useMutation({
      networkMode: "always",
      retry: false,
      mutationFn: async () => {
        const originId = queryClient.getQueryData<CurrentUserQueryData>(authKeys.me)?.data.user?.id;
        const remote = access.canMutate
          ? logout(csrfToken ?? "").then(
              () => true,
              () => false,
            )
          : Promise.resolve(false);
        dispatch(closeWelcome());
        await access.signOutLocally({ discloseRemoteLimit: !access.canMutate });
        const currentId = queryClient.getQueryData<CurrentUserQueryData>(authKeys.me)?.data.user?.id;
        if (currentId === undefined || currentId === originId) {
          queryClient.setQueryData<CurrentUserQueryData>(authKeys.me, { data: { user: null } });
          queryClient.removeQueries({ queryKey: authKeys.csrf });
          queryClient.removeQueries({ queryKey: applicationKeys.all });
          queryClient.removeQueries({ queryKey: userPreferencesKeys.all });
        }
        if (!(await remote)) {
          access.reportLocalLogout();
        }
      },
    }),
  };
}

export function useUserPreferences(userId: number | null) {
  const access = useOfflineAccess();
  return useQuery({
    queryKey: userId === null ? userPreferencesKeys.all : userPreferencesKeys.current(userId),
    queryFn: getUserPreferences,
    enabled: userId !== null && access.canReadRemote,
    retry: false,
    select: (response) => response.data.preferences,
  });
}

export function useUpdateUserPreferences() {
  const user = useCurrentUser();
  const userId = user.data?.id;
  const csrfToken = useCsrfToken().data ?? "";
  const controllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    networkMode: "always",
    retry: false,
    mutationFn: ({ input, signal }: { input: UpdateUserPreferencesInput; signal: AbortSignal }) =>
      updateUserPreferences(input, csrfToken, signal),
  });

  useEffect(() => {
    if (userId !== undefined) {
      controllerRef.current?.abort();
    }
    return () => controllerRef.current?.abort();
  }, [userId]);

  const mutate = useCallback(
    (input: UpdateUserPreferencesInput) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      mutation.mutate({ input, signal: controller.signal });
    },
    [mutation.mutate],
  );

  return { ...mutation, mutate };
}

export function useCompleteIntroduction() {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data ?? "";
  return useMutation({
    networkMode: "always",
    retry: false,
    mutationFn: () => markUserIntroduced(csrfToken),
    onSuccess: (response) => {
      const userId = queryClient.getQueryData<CurrentUserQueryData>(authKeys.me)?.data.user?.id;
      if (userId) {
        queryClient.setQueryData(userPreferencesKeys.current(userId), response);
      }
      writeLocalUserPreferences({ wasIntroduced: response.data.preferences.wasIntroduced });
    },
  });
}

export function usePasswordResetMutations() {
  const csrfToken = useCsrfToken().data ?? "";

  return {
    request: useMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (input: PasswordResetRequestInput) => requestPasswordReset(input, csrfToken),
    }),
    confirm: useMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (input: PasswordResetConfirmInput) => confirmPasswordReset(input, csrfToken),
    }),
  };
}

export function useApplications() {
  return useApplicationList("active", () => listApplications());
}

export function useApplicationsCsvExport() {
  return useOwnerMutation({ networkMode: "always", retry: false, mutationFn: exportApplicationsCsv });
}

export function useApplicationDetail(id: number | null) {
  const access = useOfflineAccess();
  const userId = useReadAccountId();
  return useQuery({
    queryKey: applicationKeys.detail(userId ?? 0, id ?? 0),
    queryFn: () => getApplicationDetail(id as number),
    enabled: id !== null && userId !== null && access.canReadRemote,
    gcTime: access.account ? OFFLINE_RETENTION_MS : 5 * 60_000,
    retry: false,
    select: (response) => response.data,
  });
}

export function useApplicationPreparationMutation(applicationId: number) {
  const userId = useReadAccountId();
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data ?? "";
  return useOwnerMutation({
    networkMode: "always",
    retry: false,
    mutationFn: (input: UpdateApplicationPreparationInput) =>
      updateApplicationPreparation(applicationId, input, csrfToken),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: applicationKeys.detail(userId ?? 0, applicationId) }),
  });
}

export function useApplicationContactMutations(applicationId: number) {
  const userId = useReadAccountId();
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data ?? "";
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: applicationKeys.detail(userId ?? 0, applicationId) });
  return {
    create: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (input: CreateApplicationContactInput) => createApplicationContact(applicationId, input, csrfToken),
      onSuccess: invalidate,
    }),
    update: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: ({ contactId, input }: { contactId: number; input: UpdateApplicationContactInput }) =>
        updateApplicationContact(applicationId, contactId, input, csrfToken),
      onSuccess: invalidate,
    }),
    remove: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (contactId: number) => deleteApplicationContact(applicationId, contactId, csrfToken),
      onSuccess: invalidate,
    }),
  };
}

export function useApplicationFollowUpMutations(applicationId: number) {
  const userId = useReadAccountId();
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data ?? "";
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: applicationKeys.detail(userId ?? 0, applicationId) });
  return {
    create: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (input: CreateApplicationFollowUpTaskInput) =>
        createApplicationFollowUpTask(applicationId, input, csrfToken),
      onSuccess: invalidate,
    }),
    update: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: ({ taskId, input }: { taskId: number; input: UpdateApplicationFollowUpTaskInput }) =>
        updateApplicationFollowUpTask(applicationId, taskId, input, csrfToken),
      onSuccess: invalidate,
    }),
    complete: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (taskId: number) => completeApplicationFollowUpTask(applicationId, taskId, csrfToken),
      onSuccess: (response, taskId) => {
        queryClient.setQueryData<ApplicationDetailResponse>(
          applicationKeys.detail(userId ?? 0, applicationId),
          (current) => {
            if (!current || !Array.isArray(current.data.followUpTasks)) {
              return current;
            }
            return {
              ...current,
              data: {
                ...current.data,
                followUpTasks: current.data.followUpTasks.map((task) =>
                  task.id === taskId ? response.data.followUpTask : task,
                ),
              },
            };
          },
        );
        return invalidate();
      },
    }),
    remove: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (taskId: number) => deleteApplicationFollowUpTask(applicationId, taskId, csrfToken),
      onSuccess: invalidate,
    }),
  };
}

export function useApplicationEventMutations(applicationId: number) {
  const userId = useReadAccountId();
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data ?? "";
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: applicationKeys.detail(userId ?? 0, applicationId) });
  return {
    create: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (input: ApplicationEventInput) => createApplicationEvent(applicationId, input, csrfToken),
      onSuccess: invalidate,
    }),
    update: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: ({ eventId, input }: { eventId: number; input: UpdateApplicationEventInput }) =>
        updateApplicationEvent(applicationId, eventId, input, csrfToken),
      onSuccess: invalidate,
    }),
    remove: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (eventId: number) => deleteApplicationEvent(applicationId, eventId, csrfToken),
      onSuccess: invalidate,
    }),
  };
}

export function useArchivedApplications() {
  return useApplicationList("archive", listArchivedApplications);
}

export function useBlacklistedApplications() {
  return useApplicationList("blacklist", listBlacklistedApplications);
}

export function useUpdateApplicationMutation() {
  const userId = useReadAccountId();
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data ?? "";
  return useOwnerMutation({
    networkMode: "always",
    retry: false,
    mutationFn: ({ id, input }: { id: number; input: UpdateApplicationInput }) =>
      updateApplication(id, input, csrfToken),
    onSuccess: async (_response, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.account(userId ?? 0) }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(userId ?? 0, id) }),
      ]);
    },
  });
}

export function useApplicationCollection(list: ApplicationList, staleTime = 0) {
  const requests = {
    active: () => listApplications(),
    archive: listArchivedApplications,
    blacklist: listBlacklistedApplications,
  };
  return useApplicationList(list, requests[list], staleTime);
}

function useApplicationList(list: ApplicationList, queryFn: () => Promise<ApplicationListResponse>, staleTime = 0) {
  const access = useOfflineAccess();
  const userId = useReadAccountId();
  return useQuery({
    queryKey: applicationKeys.list(userId ?? 0, list),
    enabled: userId !== null && access.canReadRemote,
    gcTime: access.account ? OFFLINE_RETENTION_MS : 5 * 60_000,
    queryFn,
    staleTime,
    retry: false,
    select: (response) => response.data.applications,
  });
}

export function useApplicationMutations() {
  const userId = useReadAccountId();
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data ?? "";
  const update = useUpdateApplicationMutation();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: applicationKeys.account(userId ?? 0) });
  };

  return {
    create: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (input: CreateApplicationInput) => createApplication(input, csrfToken),
      onSuccess: invalidate,
    }),
    update,
    reorder: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (input: { status: JobApplication["status"]; applicationIds: number[] }) =>
        reorderApplications(input, csrfToken),
      onSuccess: (response) => {
        queryClient.setQueryData(applicationKeys.list(userId ?? 0, "active"), response);
      },
    }),
    archive: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (id: number) => archiveApplication(id, csrfToken),
      onSuccess: invalidate,
    }),
    restore: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (id: number) => restoreApplication(id, csrfToken),
      onSuccess: invalidate,
    }),
    remove: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (id: number) => deleteApplication(id, csrfToken),
      onSuccess: invalidate,
    }),
    removeAll: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (board: "active" | "archive" | "blacklist") => removeAllApplications({ board }, csrfToken),
      onSuccess: invalidate,
    }),
    blacklist: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: ({ id, input }: { id: number; input: BlacklistInput }) => blacklistApplication(id, input, csrfToken),
      onSuccess: invalidate,
    }),
    unblacklist: useOwnerMutation({
      networkMode: "always",
      retry: false,
      mutationFn: (id: number) => unblacklistApplication(id, csrfToken),
      onSuccess: invalidate,
    }),
  };
}
