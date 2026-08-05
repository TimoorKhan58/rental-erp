import { useAppMutation } from "@/lib/query";
import { resetUserPassword } from "../services";
import type { ResetUserPasswordPayload } from "../types";

export function useResetUserPassword() {
  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ResetUserPasswordPayload;
    }) => resetUserPassword(id, payload),
    showSuccessToast: true,
    successMessage: "Password reset successfully. The user must sign in again.",
  });
}
