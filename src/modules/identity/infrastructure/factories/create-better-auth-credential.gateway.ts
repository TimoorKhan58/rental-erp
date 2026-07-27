import type { IIdentityAuthGateway } from "@/modules/identity/application/services/identity-auth.gateway.interface";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";

import { BetterAuthCredentialGateway } from "../gateways/better-auth-credential.gateway";

export function createBetterAuthCredentialGatewayFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IIdentityAuthGateway {
  return new BetterAuthCredentialGateway(context.tx);
}
