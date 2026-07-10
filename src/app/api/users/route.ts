import type { NextRequest } from "next/server";

import {
  handleCreateIdentityUser,
  handleListIdentityUsers,
} from "@/modules/identity/presentation/routes/identity-api.routes";

import { resolveIdentityApplicationServices } from "./_composition/resolve-identity-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListIdentityUsers(request, resolveIdentityApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateIdentityUser(request, resolveIdentityApplicationServices);
}
