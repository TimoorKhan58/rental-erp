import type { CreateUserFormValues, UpdateUserFormValues } from "../schemas";
import type { CreateUserPayload, UpdateUserPayload, UserResponse } from "../types";

export function toCreateUserPayload(values: CreateUserFormValues): CreateUserPayload {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    role: values.role,
    isActive: values.isActive,
  };
}

export function toUpdateUserPayload(values: UpdateUserFormValues): UpdateUserPayload {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    role: values.role,
  };
}

export function toUserFormValues(user: UserResponse): UpdateUserFormValues {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
