import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, useAppMutation } from "@/lib/query";
import { createUser } from "../services";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createUser,
    showSuccessToast: true,
    successMessage: "User created successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
}
