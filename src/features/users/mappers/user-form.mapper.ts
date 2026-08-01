import type {
  CreateUserFormValues,
  UpdateUserFormValues,
} from "../schemas";
import type {
  CreateUserPayload,
  IdentityUserResponse,
  UpdateUserPayload,
} from "../types";

export function toCreateUserPayload(
  values: CreateUserFormValues,
): CreateUserPayload {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    role: values.role,
    isActive: values.isActive,
  };
}

export function toUpdateUserPayload(
  values: UpdateUserFormValues,
): UpdateUserPayload {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    role: values.role,
    isActive: values.isActive,
  };
}

export function toUserFormValues(
  user: IdentityUserResponse,
): UpdateUserFormValues {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}
