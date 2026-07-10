import type { NextRequest } from "next/server";

import { handleGetIdentityUserProfile } from "@/modules/identity/presentation/routes/identity-api.routes";

import { resolveIdentityApplicationServices } from "../_composition/resolve-identity-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetIdentityUserProfile(
    request,
    resolveIdentityApplicationServices,
  );
}
