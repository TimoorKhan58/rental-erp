import type { IdentityWriteScope } from "@/modules/identity/application/services/identity-transaction.runner";
import type { IIdentityTransactionRunner } from "@/modules/identity/application/services/identity-transaction.runner";
import type { IIdentityAuthGateway } from "@/modules/identity/application/services/identity-auth.gateway.interface";

import type { InMemoryIdentityUserRepository } from "./in-memory-identity-user.repository";
import type { InMemoryRoleRepository } from "./in-memory-identity-user.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export class MockIdentityAuthGateway implements IIdentityAuthGateway {
  readonly createdUsers: Array<{
    email: string;
    name: string;
    password: string;
    role: string;
    erpUserId: string;
  }> = [];
  readonly passwordResets: Array<{ authUserId: string; password: string }> = [];
  readonly revokedSessions: string[] = [];

  async createCredentialUser(input: {
    email: string;
    name: string;
    password: string;
    role: string;
    erpUserId: string;
  }): Promise<{ authUserId: string }> {
    this.createdUsers.push(input);
    return { authUserId: `auth-${input.erpUserId}` };
  }

  async updateCredentialUser(): Promise<void> {
    return Promise.resolve();
  }

  async resetCredentialPassword(input: {
    authUserId: string;
    password: string;
  }): Promise<void> {
    this.passwordResets.push(input);
  }

  async revokeSessions(authUserId: string): Promise<void> {
    this.revokedSessions.push(authUserId);
  }
}

export function createPassThroughIdentityTransactionRunner(
  scope: IdentityWriteScope,
): IIdentityTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackIdentityTransactionRunner(
  userRepository: InMemoryIdentityUserRepository,
  roleRepository: InMemoryRoleRepository,
  authGateway: MockIdentityAuthGateway,
  auditLogger: MockAuditLogger,
  actorUserId?: string,
): IIdentityTransactionRunner {
  return {
    run: async (operation) => {
      const userSnapshot = userRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();
      const createdUsersSnapshot = [...authGateway.createdUsers];
      const passwordResetsSnapshot = [...authGateway.passwordResets];
      const revokedSessionsSnapshot = [...authGateway.revokedSessions];

      try {
        return await operation({
          userRepository,
          roleRepository,
          authGateway,
          auditLogger,
          actorUserId,
        });
      } catch (error) {
        userRepository.restore(userSnapshot);
        auditLogger.restore(auditSnapshot);
        authGateway.createdUsers.length = 0;
        authGateway.createdUsers.push(...createdUsersSnapshot);
        authGateway.passwordResets.length = 0;
        authGateway.passwordResets.push(...passwordResetsSnapshot);
        authGateway.revokedSessions.length = 0;
        authGateway.revokedSessions.push(...revokedSessionsSnapshot);
        throw error;
      }
    },
  };
}
