import { describe, expect, it } from "vitest";
import {
  toCreateUserPayload,
  toUpdateUserPayload,
  toUserFormValues,
} from "./user-form.mapper";
import type { IdentityUserResponse } from "../types";

const sampleUser: IdentityUserResponse = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Ada Lovelace",
  email: "ada@example.com",
  roleId: "22222222-2222-2222-2222-222222222222",
  role: "manager",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("user form mappers", () => {
  it("maps create form values to API payload", () => {
    expect(
      toCreateUserPayload({
        name: "  Ada Lovelace  ",
        email: "Ada@Example.com",
        role: "manager",
        isActive: true,
      }),
    ).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "manager",
      isActive: true,
    });
  });

  it("maps update form values to API payload", () => {
    expect(
      toUpdateUserPayload({
        name: "Ada",
        email: "ADA@EXAMPLE.COM",
        role: "owner",
        isActive: false,
      }),
    ).toEqual({
      name: "Ada",
      email: "ada@example.com",
      role: "owner",
      isActive: false,
    });
  });

  it("maps user response to edit form values", () => {
    expect(toUserFormValues(sampleUser)).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "manager",
      isActive: true,
    });
  });
});
