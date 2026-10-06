import { type MutateOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError, assertAuthenticatedWrite } from "../../lib/api";
import { useReadAccountId } from "./offline-access";

type OwnerMutationInvocation<TVariables> = { ownerId: number | null; variables: TVariables };

/** Carry ownership in immutable invocation variables, not render-time success closures. */
export function useOwnerMutation<TData, TVariables = void>(options: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => unknown;
  networkMode?: "always";
  retry?: false;
}) {
  const client = useQueryClient();
  const invocationOwnerId = useReadAccountId();
  const currentVerifiedOwnerId = () =>
    client.getQueryData<{ data: { user: { id: number } | null } }>(["auth", "me"])?.data.user?.id;
  const belongsToCurrentOwner = (invocation: OwnerMutationInvocation<TVariables>) =>
    invocation.ownerId !== null && invocation.ownerId === currentVerifiedOwnerId();
  const mutation = useMutation<TData, Error, OwnerMutationInvocation<TVariables>>({
    networkMode: "always",
    retry: false,
    mutationFn: (invocation) => {
      assertAuthenticatedWrite();
      if (!belongsToCurrentOwner(invocation))
        throw new ApiRequestError("The verified account changed", "OFFLINE_READ_ONLY", 0);
      return options.mutationFn(invocation.variables);
    },
    onSuccess: async (data, invocation) => {
      if (belongsToCurrentOwner(invocation)) await options.onSuccess?.(data, invocation.variables);
    },
  });
  function ownerScopedCallbacks(
    value?: MutateOptions<TData, Error, TVariables>,
  ): MutateOptions<TData, Error, OwnerMutationInvocation<TVariables>> {
    return {
      onSuccess: (data, invocation, context, mutationContext) => {
        if (belongsToCurrentOwner(invocation)) value?.onSuccess?.(data, invocation.variables, context, mutationContext);
      },
      onError: (error, invocation, context, mutationContext) => {
        if (belongsToCurrentOwner(invocation)) value?.onError?.(error, invocation.variables, context, mutationContext);
      },
      onSettled: (data, error, invocation, context, mutationContext) => {
        if (belongsToCurrentOwner(invocation))
          value?.onSettled?.(data, error, invocation.variables, context, mutationContext);
      },
    };
  }
  return {
    ...mutation,
    variables: mutation.variables?.variables,
    mutate: (variables: TVariables, value?: MutateOptions<TData, Error, TVariables>) =>
      mutation.mutate({ ownerId: invocationOwnerId, variables }, ownerScopedCallbacks(value)),
    mutateAsync: async (variables: TVariables, value?: MutateOptions<TData, Error, TVariables>) => {
      const invocation = { ownerId: invocationOwnerId, variables };
      const result = await mutation.mutateAsync(invocation, ownerScopedCallbacks(value));
      if (!belongsToCurrentOwner(invocation))
        throw new ApiRequestError("The verified account changed", "OFFLINE_READ_ONLY", 0);
      return result;
    },
  };
}
