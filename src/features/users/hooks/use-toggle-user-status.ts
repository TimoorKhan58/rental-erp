import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, useAppMutation } from "@/lib/query";
import { activateUser, deactivateUser } from "../services";

async function invalidateUserQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) }),
  ]);
}

export function useActivateUser() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: activateUser,
    showSuccessToast: true,
    successMessage: "User activated successfully.",
    onSuccess: async (data) => {
      await invalidateUserQueries(queryClient, data.id);
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: deactivateUser,
    showSuccessToast: true,
    successMessage: "User deactivated successfully.",
    onSuccess: async (_data, id) => {
      await invalidateUserQueries(queryClient, id);
    },
  });
}
