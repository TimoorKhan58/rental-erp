import type { IIdentityTransactionRunner } from "@/modules/identity/application/services/identity-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createBetterAuthCredentialGatewayFromUnitOfWork } from "./create-better-auth-credential.gateway";
import {
  createIdentityUserRepositoryFromUnitOfWork,
  createRoleRepositoryFromUnitOfWork,
} from "./create-identity-user.repository";

export function createIdentityTransactionRunner(
  deps: SharedDeps,
  actorUserId?: string,
): IIdentityTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          userRepository: createIdentityUserRepositoryFromUnitOfWork(context),
          roleRepository: createRoleRepositoryFromUnitOfWork(context),
          authGateway: createBetterAuthCredentialGatewayFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
          actorUserId,
        }),
      ),
  };
}
