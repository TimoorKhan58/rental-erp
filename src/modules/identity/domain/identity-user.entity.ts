import type { RoleId, UserId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";
import type { UserRole } from "@/constants/roles";

import { IdentityUserInvariantError } from "./identity-user.errors";
import type {
  CreateIdentityUserData,
  UpdateIdentityUserData,
} from "./identity-user.types";

export interface IdentityUserProps {
  id: UserId;
  name: string;
  email: string;
  roleId: RoleId;
  roleName: UserRole;
  authUserId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class IdentityUser implements Entity<UserId> {
  readonly id: UserId;
  readonly name: string;
  readonly email: string;
  readonly roleId: RoleId;
  readonly roleName: UserRole;
  readonly authUserId: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: IdentityUserProps) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.roleId = props.roleId;
    this.roleName = props.roleName;
    this.authUserId = props.authUserId;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    data: CreateIdentityUserData,
  ): Omit<
    IdentityUserProps,
    "id" | "authUserId" | "createdAt" | "updatedAt"
  > {
    return {
      name: normalizeRequiredText(data.name, "name"),
      email: normalizeEmail(data.email),
      roleId: data.roleId,
      roleName: data.roleName,
      isActive: data.isActive ?? true,
    };
  }

  static reconstitute(props: IdentityUserProps): IdentityUser {
    return new IdentityUser({
      id: props.id,
      name: normalizeRequiredText(props.name, "name"),
      email: normalizeEmail(props.email),
      roleId: props.roleId,
      roleName: props.roleName,
      authUserId: props.authUserId,
      isActive: props.isActive,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  applyUpdate(data: UpdateIdentityUserData): IdentityUserProps {
    return {
      id: this.id,
      name: data.name !== undefined ? normalizeRequiredText(data.name, "name") : this.name,
      email: data.email !== undefined ? normalizeEmail(data.email) : this.email,
      roleId: data.roleId ?? this.roleId,
      roleName: data.roleName ?? this.roleName,
      authUserId: data.authUserId !== undefined ? data.authUserId : this.authUserId,
      isActive: data.isActive ?? this.isActive,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    };
  }

  deactivate(): IdentityUserProps {
    if (!this.isActive) {
      throw new IdentityUserInvariantError("User is already inactive");
    }

    return {
      ...this.toProps(),
      isActive: false,
      updatedAt: new Date(),
    };
  }

  toProps(): IdentityUserProps {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      roleId: this.roleId,
      roleName: this.roleName,
      authUserId: this.authUserId,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

function normalizeRequiredText(value: string, field: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new IdentityUserInvariantError(`${field} is required`, field);
  }

  return trimmed;
}

function normalizeEmail(value: string): string {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.length === 0) {
    throw new IdentityUserInvariantError("email is required", "email");
  }

  return trimmed;
}
