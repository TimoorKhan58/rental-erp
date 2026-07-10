import type { NextRequest } from "next/server";

import {
  handleGetSettings,
  handleUpdateSettings,
} from "@/modules/settings/presentation/routes/settings-api.routes";

import { resolveSettingsApplicationServices } from "./_composition/resolve-settings-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetSettings(request, resolveSettingsApplicationServices);
}

export async function PATCH(request: NextRequest): Promise<Response> {
  return handleUpdateSettings(request, resolveSettingsApplicationServices);
}
