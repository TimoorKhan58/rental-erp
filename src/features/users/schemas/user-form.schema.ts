import { z } from "zod";
import { USER_ROLE_LIST } from "@/constants/roles";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(200, "Name must not exceed 200 characters");

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(254, "Email must not exceed 254 characters");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters");

const roleSchema = z.enum(USER_ROLE_LIST);

export const createUserFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: roleSchema,
  isActive: z.boolean(),
});

export const updateUserFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: roleSchema,
  isActive: z.boolean(),
});

export const resetPasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm the new password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserFormSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;
