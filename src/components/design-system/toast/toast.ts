import { toast } from "sonner";

/**
 * Standardized toast helpers using semantic variants.
 *
 * @example
 * appToast.success("Customer saved");
 * appToast.error("Unable to save changes");
 */
export const appToast = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),

  error: (message: string, description?: string) =>
    toast.error(message, { description }),

  warning: (message: string, description?: string) =>
    toast.warning(message, { description }),

  info: (message: string, description?: string) =>
    toast.info(message, { description }),

  loading: (message: string) => toast.loading(message),

  dismiss: (id?: string | number) => toast.dismiss(id),

  promise: toast.promise,
} as const;

export { toast };
