import { describe, expect, it } from "vitest";
import {
  toCreateUserPayload,
  toUpdateUserPayload,
  toUserFormValues,
} from "./user-form.mapper";
import type { UserResponse } from "../types";

const user: UserResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Jane Doe",
  email: "Jane@Example.com",
  roleId: "role-1",
  role: "viewer",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("user form mappers", () => {
  it("maps create form values to API payload", () => {
    expect(
      toCreateUserPayload({
        name: " Jane Doe ",
        email: "Jane@Example.com",
        password: "password123",
        role: "manager",
        isActive: true,
      }),
    ).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      role: "manager",
      isActive: true,
    });
  });

  it("maps update form values without status", () => {
    expect(
      toUpdateUserPayload({
        name: " Jane Doe ",
        email: "Jane@Example.com",
        role: "accountant",
      }),
    ).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      role: "accountant",
    });
  });

  it("maps user entity to edit form values without status", () => {
    expect(toUserFormValues(user)).toEqual({
      name: "Jane Doe",
      email: "Jane@Example.com",
      role: "viewer",
    });
  });
});
