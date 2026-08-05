import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, useAppMutation } from "@/lib/query";
import { updateUser } from "../services";
import type { UpdateUserPayload } from "../types";

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    showSuccessToast: true,
    successMessage: "User updated successfully.",
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(id) });

      const previous = queryClient.getQueryData(queryKeys.users.detail(id));

      if (previous) {
        queryClient.setQueryData(queryKeys.users.detail(id), {
          ...previous,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.users.detail(id), context.previous);
      }
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(data.id) }),
      ]);
    },
  });
}
