import type { UserRole } from "@/constants/roles";

/** Shared auth-related types — no business entity types. */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
};

export type AuthSession = {
  user: AuthUser;
  session: {
    id: string;
    expiresAt: Date;
  };
};
