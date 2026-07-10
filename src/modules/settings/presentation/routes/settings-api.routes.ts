import type { NextRequest } from "next/server";

import type { SettingsServiceResolver } from "@/modules/settings/application/services/settings-application-services.interface";
import type { SettingsProfileDto } from "@/modules/settings/application/dtos/settings.dto";
import { UpdateSettingsSchema } from "@/modules/settings/application";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";

import { toSettingsProfileResponse } from "../mappers/settings-response.mapper";
import {
  runSettingsApiRoute,
  toJsonResponse,
} from "../http/settings-api.route-runner";
import { SETTINGS_ROUTES } from "../routes/settings.routes";

export async function handleGetSettings(
  request: NextRequest,
  resolveServices: SettingsServiceResolver,
): Promise<Response> {
  const result = await runSettingsApiRoute({
    request,
    route: SETTINGS_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.settings.read,
    resolveServices,
    handler: async (_ctx, services) => services.getSettings.execute(),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toSettingsProfileResponse(result.body.data as SettingsProfileDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateSettings(
  request: NextRequest,
  resolveServices: SettingsServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateSettingsSchema, body);

  const result = await runSettingsApiRoute({
    request,
    route: SETTINGS_ROUTES.base,
    httpMethod: "PATCH",
    permission: PERMISSIONS.settings.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateSettings.execute(updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toSettingsProfileResponse(result.body.data as SettingsProfileDto),
      },
    });
  }

  return toJsonResponse(result);
}
