import { createIdentityApplicationServices } from "@/modules/identity/infrastructure/factories/create-identity.services";
import type { IdentityServiceResolver } from "@/modules/identity/presentation/routes/identity-api.routes";
import { isUserRole } from "@/shared/application/authorization/types";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

export const resolveIdentityApplicationServices: IdentityServiceResolver = (
  ctx,
) => {
  const role = ctx.request.role;
  const actorRole = role !== undefined && isUserRole(role) ? role : undefined;

  return createIdentityApplicationServices(
    createSharedDepsFromExecutionContext(ctx),
    ctx.request.userId,
    actorRole,
  );
};
