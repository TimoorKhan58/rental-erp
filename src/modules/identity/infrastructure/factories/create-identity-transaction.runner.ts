import type { IIdentityTransactionRunner } from "@/modules/identity/application/services/identity-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { BetterAuthCredentialGateway } from "../gateways/better-auth-credential.gateway";
import {
  createIdentityUserRepositoryFromUnitOfWork,
  createRoleRepositoryFromUnitOfWork,
} from "./create-identity-user.repository";

export function createIdentityTransactionRunner(
  deps: SharedDeps,
  actorUserId?: string,
): IIdentityTransactionRunner {
  const authGateway = new BetterAuthCredentialGateway(deps.prisma);

  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          userRepository: createIdentityUserRepositoryFromUnitOfWork(context),
          roleRepository: createRoleRepositoryFromUnitOfWork(context),
          authGateway,
          auditLogger: context.deps.auditLogger,
          actorUserId,
        }),
      ),
  };
}
