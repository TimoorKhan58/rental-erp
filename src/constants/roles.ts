/**
 * Application user roles — permissions will be implemented in a future milestone.
 */
export const USER_ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  WORKER: "worker",
  ACCOUNTANT: "accountant",
  VIEWER: "viewer",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_ROLE_LIST: UserRole[] = [
  USER_ROLES.OWNER,
  USER_ROLES.MANAGER,
  USER_ROLES.WORKER,
  USER_ROLES.ACCOUNTANT,
  USER_ROLES.VIEWER,
];

export const DEFAULT_USER_ROLE: UserRole = USER_ROLES.VIEWER;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.OWNER]: "Owner",
  [USER_ROLES.MANAGER]: "Manager",
  [USER_ROLES.WORKER]: "Worker",
  [USER_ROLES.ACCOUNTANT]: "Accountant",
  [USER_ROLES.VIEWER]: "Viewer",
};
