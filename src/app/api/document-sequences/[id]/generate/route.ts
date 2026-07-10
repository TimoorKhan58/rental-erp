import type { NextRequest } from "next/server";

import { handleGenerateNextNumber } from "@/modules/settings/presentation/routes/number-sequence-api.routes";

import { resolveSettingsApplicationServices } from "../../_composition/resolve-settings-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGenerateNextNumber(
    request,
    id,
    resolveSettingsApplicationServices,
  );
}
