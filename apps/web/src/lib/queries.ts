import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BlacklistInput,
  CreateApplicationInput,
  CurrentUserResponse,
  JobApplication,
  LoginInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  RegisterInput,
  UpdateApplicationInput,
} from "@xeniway/shared";
import {
  applicationKeys,
  archiveApplication,
  blacklistApplication,
  confirmPasswordReset,
  createApplication,
  deleteApplication,
  getCsrfToken,
  getCurrentUser,
  listApplications,
  listArchivedApplications,
  listBlacklistedApplications,
  login,
  logout,
  register,
  reorderApplications,
  requestPasswordReset,
  restoreApplication,
  unblacklistApplication,
  updateApplication,
} from "./api";

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
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken().data;

  const finishAuth = (response: Awaited<ReturnType<typeof login>>) => {
    queryClient.setQueryData(authKeys.me, { data: { user: response.data.user } });
    queryClient.setQueryData(authKeys.csrf, { data: { csrfToken: response.data.csrfToken } });
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
        queryClient.setQueryData<CurrentUserQueryData>(authKeys.me, { data: { user: null } });
        queryClient.removeQueries({ queryKey: authKeys.csrf });
        queryClient.removeQueries({ queryKey: applicationKeys.all });
      },
    }),
  };
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
  return useQuery({
    queryKey: applicationKeys.list("active"),
    queryFn: () => listApplications(),
    retry: false,
    select: (response) => response.data.applications,
  });
}

export function useArchivedApplications() {
  return useQuery({
    queryKey: applicationKeys.list("archive"),
    queryFn: listArchivedApplications,
    retry: false,
    select: (response) => response.data.applications,
  });
}

export function useBlacklistedApplications() {
  return useQuery({
    queryKey: applicationKeys.list("blacklist"),
    queryFn: listBlacklistedApplications,
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
