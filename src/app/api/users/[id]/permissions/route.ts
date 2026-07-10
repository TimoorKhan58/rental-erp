import type { NextRequest } from "next/server";

import { handleGetIdentityUserPermissions } from "@/modules/identity/presentation/routes/identity-api.routes";

import { resolveIdentityApplicationServices } from "../../_composition/resolve-identity-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetIdentityUserPermissions(
    request,
    id,
    resolveIdentityApplicationServices,
  );
}
