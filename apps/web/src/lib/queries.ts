import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
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
    select: (response) => response.data.user,
  });
}

export function useCsrfToken() {
  return useQuery({
    queryKey: authKeys.csrf,
    queryFn: getCsrfToken,
    staleTime: 60 * 60 * 1000,
    select: (response) => response.data.csrfToken,
  });
}

export function useAuthMutations() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data;

  const finishAuth = (response: Awaited<ReturnType<typeof login>>) => {
    queryClient.setQueryData(authKeys.me, { data: { user: response.data.user } });
    queryClient.setQueryData(authKeys.csrf, { data: { csrfToken: response.data.csrfToken } });
    queryClient.removeQueries({ queryKey: userPreferencesKeys.all });
    dispatch(openWelcome());
  };

  return {
    login: useMutation({
      mutationFn: (input: LoginInput) => login(input, csrfToken ?? ""),
      onSuccess: finishAuth,
    }),
    register: useMutation({
      mutationFn: (input: RegisterInput) => register(input, csrfToken ?? ""),
      onSuccess: finishAuth,
    }),
    logout: useMutation({
      mutationFn: () => logout(csrfToken ?? ""),
      onSuccess: () => {
        dispatch(closeWelcome());
        queryClient.setQueryData<CurrentUserQueryData>(authKeys.me, { data: { user: null } });
        queryClient.removeQueries({ queryKey: authKeys.csrf });
        queryClient.removeQueries({ queryKey: applicationKeys.all });
        queryClient.removeQueries({ queryKey: userPreferencesKeys.all });
      },
    }),
  };
}

export function useUserPreferences(userId: number | null) {
  return useQuery({
    queryKey: userId === null ? userPreferencesKeys.all : userPreferencesKeys.current(userId),
    queryFn: getUserPreferences,
    enabled: userId !== null,
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
    mutationFn: ({ input, signal }: { input: UpdateUserPreferencesInput; signal: AbortSignal }) =>
      updateUserPreferences(input, csrfToken, signal),
  });

  useEffect(() => {
    if (userId !== undefined) controllerRef.current?.abort();
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
    mutationFn: () => markUserIntroduced(csrfToken),
    onSuccess: (response) => {
      const userId = queryClient.getQueryData<CurrentUserQueryData>(authKeys.me)?.data.user?.id;
      if (userId) queryClient.setQueryData(userPreferencesKeys.current(userId), response);
      writeLocalUserPreferences({ wasIntroduced: response.data.preferences.wasIntroduced });
    },
  });
}

export function usePasswordResetMutations() {
  const csrfToken = useCsrfToken().data ?? "";

  return {
    request: useMutation({
      mutationFn: (input: PasswordResetRequestInput) => requestPasswordReset(input, csrfToken),
    }),
    confirm: useMutation({
      mutationFn: (input: PasswordResetConfirmInput) => confirmPasswordReset(input, csrfToken),
    }),
  };
}

export function useApplications() {
  return useApplicationList("active", () => listApplications());
}

export function useApplicationsCsvExport() {
  return useMutation({ mutationFn: exportApplicationsCsv });
}

export function useApplicationDetail(id: number | null) {
  return useQuery({
    queryKey: applicationKeys.detail(id ?? 0),
    queryFn: () => getApplicationDetail(id as number),
    enabled: id !== null,
    retry: false,
    select: (response) => response.data,
  });
}

export function useApplicationPreparationMutation(applicationId: number) {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data ?? "";
  return useMutation({
    mutationFn: (input: UpdateApplicationPreparationInput) =>
      updateApplicationPreparation(applicationId, input, csrfToken),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) }),
  });
}

export function useApplicationContactMutations(applicationId: number) {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data ?? "";
  const invalidate = () => queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) });
  return {
    create: useMutation({
      mutationFn: (input: CreateApplicationContactInput) => createApplicationContact(applicationId, input, csrfToken),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ contactId, input }: { contactId: number; input: UpdateApplicationContactInput }) =>
        updateApplicationContact(applicationId, contactId, input, csrfToken),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (contactId: number) => deleteApplicationContact(applicationId, contactId, csrfToken),
      onSuccess: invalidate,
    }),
  };
}

export function useApplicationFollowUpMutations(applicationId: number) {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data ?? "";
  const invalidate = () => queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) });
  return {
    create: useMutation({
      mutationFn: (input: CreateApplicationFollowUpTaskInput) =>
        createApplicationFollowUpTask(applicationId, input, csrfToken),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ taskId, input }: { taskId: number; input: UpdateApplicationFollowUpTaskInput }) =>
        updateApplicationFollowUpTask(applicationId, taskId, input, csrfToken),
      onSuccess: invalidate,
    }),
    complete: useMutation({
      mutationFn: (taskId: number) => completeApplicationFollowUpTask(applicationId, taskId, csrfToken),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (taskId: number) => deleteApplicationFollowUpTask(applicationId, taskId, csrfToken),
      onSuccess: invalidate,
    }),
  };
}

export function useApplicationEventMutations(applicationId: number) {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data ?? "";
  const invalidate = () => queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) });
  return {
    create: useMutation({
      mutationFn: (input: ApplicationEventInput) => createApplicationEvent(applicationId, input, csrfToken),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ eventId, input }: { eventId: number; input: UpdateApplicationEventInput }) =>
        updateApplicationEvent(applicationId, eventId, input, csrfToken),
      onSuccess: invalidate,
    }),
    remove: useMutation({
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

function useApplicationList(list: ApplicationList, queryFn: () => Promise<ApplicationListResponse>) {
  return useQuery({
    queryKey: applicationKeys.list(list),
    queryFn,
    retry: false,
    select: (response) => response.data.applications,
  });
}

export function useApplicationMutations() {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data ?? "";
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: applicationKeys.all });
  };

  return {
    create: useMutation({
      mutationFn: (input: CreateApplicationInput) => createApplication(input, csrfToken),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: number; input: UpdateApplicationInput }) =>
        updateApplication(id, input, csrfToken),
      onSuccess: invalidate,
    }),
    reorder: useMutation({
      mutationFn: (input: { status: JobApplication["status"]; applicationIds: number[] }) =>
        reorderApplications(input, csrfToken),
      onSuccess: (response) => {
        queryClient.setQueryData(applicationKeys.list("active"), response);
      },
    }),
    archive: useMutation({
      mutationFn: (id: number) => archiveApplication(id, csrfToken),
      onSuccess: invalidate,
    }),
    restore: useMutation({
      mutationFn: (id: number) => restoreApplication(id, csrfToken),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: number) => deleteApplication(id, csrfToken),
      onSuccess: invalidate,
    }),
    removeAll: useMutation({
      mutationFn: (board: "active" | "archive" | "blacklist") => removeAllApplications({ board }, csrfToken),
      onSuccess: invalidate,
    }),
    blacklist: useMutation({
      mutationFn: ({ id, input }: { id: number; input: BlacklistInput }) => blacklistApplication(id, input, csrfToken),
      onSuccess: invalidate,
    }),
    unblacklist: useMutation({
      mutationFn: (id: number) => unblacklistApplication(id, csrfToken),
      onSuccess: invalidate,
    }),
  };
}
