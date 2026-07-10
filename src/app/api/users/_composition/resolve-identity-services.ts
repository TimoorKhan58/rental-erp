import { createIdentityApplicationServices } from "@/modules/identity/infrastructure/factories/create-identity.services";
import type { IdentityServiceResolver } from "@/modules/identity/presentation/routes/identity-api.routes";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

export const resolveIdentityApplicationServices: IdentityServiceResolver = (
  ctx,
) =>
  createIdentityApplicationServices(
    createSharedDepsFromExecutionContext(ctx),
    ctx.request.userId,
  );
