import type { IIdentityUserRepository } from "@/modules/identity/domain/identity-user.repository.interface";
import type { IRoleRepository } from "@/modules/identity/domain/identity-user.repository.interface";
import type { UserRole } from "@/constants/roles";
import type { IIdentityAuthGateway } from "./identity-auth.gateway.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface IdentityWriteScope {
  readonly userRepository: IIdentityUserRepository;
  readonly roleRepository: IRoleRepository;
  readonly authGateway: IIdentityAuthGateway;
  readonly auditLogger: IAuditLogger;
  readonly actorUserId?: string;
  readonly actorRole?: UserRole;
}

export interface IIdentityTransactionRunner {
  run<T>(operation: (scope: IdentityWriteScope) => Promise<T>): Promise<T>;
}
