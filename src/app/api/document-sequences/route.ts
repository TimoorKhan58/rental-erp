import type { NextRequest } from "next/server";

import { handleListNumberSequences } from "@/modules/settings/presentation/routes/number-sequence-api.routes";

import { resolveSettingsApplicationServices } from "./_composition/resolve-settings-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListNumberSequences(request, resolveSettingsApplicationServices);
}
