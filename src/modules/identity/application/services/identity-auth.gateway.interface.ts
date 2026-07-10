import type { UserRole } from "@/constants/roles";

export interface CreateAuthCredentialInput {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  erpUserId: string;
}

export interface UpdateAuthCredentialInput {
  authUserId: string;
  email?: string;
  name?: string;
  role?: UserRole;
  erpUserId?: string;
}

export interface ResetAuthCredentialPasswordInput {
  authUserId: string;
  password: string;
}

export interface IIdentityAuthGateway {
  createCredentialUser(
    input: CreateAuthCredentialInput,
  ): Promise<{ authUserId: string }>;
  updateCredentialUser(input: UpdateAuthCredentialInput): Promise<void>;
  resetCredentialPassword(
    input: ResetAuthCredentialPasswordInput,
  ): Promise<void>;
  revokeSessions(authUserId: string): Promise<void>;
}
