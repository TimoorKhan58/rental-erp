import type { NextRequest } from "next/server";

import {
  handleDeactivateIdentityUser,
  handleGetIdentityUserById,
  handleUpdateIdentityUser,
} from "@/modules/identity/presentation/routes/identity-api.routes";

import { resolveIdentityApplicationServices } from "../_composition/resolve-identity-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetIdentityUserById(
    request,
    id,
    resolveIdentityApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateIdentityUser(
    request,
    id,
    resolveIdentityApplicationServices,
  );
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDeactivateIdentityUser(
    request,
    id,
    resolveIdentityApplicationServices,
  );
}
