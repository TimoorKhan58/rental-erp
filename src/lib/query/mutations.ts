import {
  useMutation,
  type MutationFunction,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api";

export type MutationConfig<TData, TVariables, TContext = unknown> = Omit<
  UseMutationOptions<TData, ApiClientError, TVariables, TContext>,
  "mutationFn"
> & {
  mutationFn: MutationFunction<TData, TVariables>;
  successMessage?: string;
  errorMessage?: string;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
};

export function useAppMutation<TData, TVariables, TContext = unknown>(
  config: MutationConfig<TData, TVariables, TContext>,
): UseMutationResult<TData, ApiClientError, TVariables, TContext> {
  const {
    successMessage,
    errorMessage,
    showErrorToast = true,
    showSuccessToast = false,
    onSuccess,
    onError,
    ...options
  } = config;

  return useMutation({
    ...options,
    onSuccess: (data, variables, onMutateResult, context) => {
      if (showSuccessToast && successMessage) {
        toast.success(successMessage);
      }

      onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (showErrorToast) {
        toast.error(errorMessage ?? error.message);
      }

      onError?.(error, variables, onMutateResult, context);
    },
  });
}
