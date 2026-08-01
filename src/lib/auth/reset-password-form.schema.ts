import { z } from "zod";

const MAX_PASSWORD_LENGTH = 128;

export function createSelfServiceResetPasswordSchema(minPasswordLength: number) {
  const passwordSchema = z
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
      password: passwordSchema,
      confirmPassword: z.string().min(1, "Confirm the new password"),
    })
    .refine((value) => value.password === value.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
}

export type SelfServiceResetPasswordFormValues = z.infer<
  ReturnType<typeof createSelfServiceResetPasswordSchema>
>;
