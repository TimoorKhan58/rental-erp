import { z } from "zod";

const MAX_PASSWORD_LENGTH = 128;

export function createChangePasswordSchema(minPasswordLength: number) {
  const newPasswordSchema = z
    .string()
    .min(
      minPasswordLength,
      `Password must be at least ${minPasswordLength} characters`,
    )
    .max(
      MAX_PASSWORD_LENGTH,
      `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`,
    );

  return z
    .object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: newPasswordSchema,
      confirmPassword: z.string().min(1, "Confirm the new password"),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
}

export type ChangePasswordFormValues = z.infer<
  ReturnType<typeof createChangePasswordSchema>
>;
