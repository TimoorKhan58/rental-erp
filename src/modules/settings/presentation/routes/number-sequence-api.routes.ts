import type { NextRequest } from "next/server";

import type { SettingsServiceResolver } from "@/modules/settings/application/services/settings-application-services.interface";
import type {
  GenerateNextNumberDto,
  NumberSequenceDto,
} from "@/modules/settings/application/dtos/number-sequence.dto";
import {
  NumberSequenceIdParamSchema,
  UpdateNumberSequenceSchema,
} from "@/modules/settings/application";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";

import {
  toGenerateNextNumberResponse,
  toNumberSequenceListResponse,
  toNumberSequenceResponse,
} from "../mappers/number-sequence-response.mapper";
import {
  runNumberSequenceApiRoute,
  toJsonResponse,
} from "../http/number-sequence-api.route-runner";
import { SETTINGS_ROUTES } from "../routes/settings.routes";

export async function handleListNumberSequences(
  request: NextRequest,
  resolveServices: SettingsServiceResolver,
): Promise<Response> {
  const result = await runNumberSequenceApiRoute({
    request,
    route: SETTINGS_ROUTES.sequences,
    httpMethod: "GET",
    permission: PERMISSIONS.sequences.read,
    resolveServices,
    handler: async (_ctx, services) => services.listNumberSequences.execute(),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toNumberSequenceListResponse(result.body.data as NumberSequenceDto[]),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetNumberSequenceById(
  request: NextRequest,
  id: string,
  resolveServices: SettingsServiceResolver,
): Promise<Response> {
  const params = parseRequest(NumberSequenceIdParamSchema, { id });

  const result = await runNumberSequenceApiRoute({
    request,
    route: SETTINGS_ROUTES.sequenceById(id),
    httpMethod: "GET",
    permission: PERMISSIONS.sequences.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getNumberSequenceById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toNumberSequenceResponse(result.body.data as NumberSequenceDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateNumberSequence(
  request: NextRequest,
  id: string,
  resolveServices: SettingsServiceResolver,
): Promise<Response> {
  const params = parseRequest(NumberSequenceIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateNumberSequenceSchema, body);

  const result = await runNumberSequenceApiRoute({
    request,
    route: SETTINGS_ROUTES.sequenceById(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.sequences.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateNumberSequence.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toNumberSequenceResponse(result.body.data as NumberSequenceDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGenerateNextNumber(
  request: NextRequest,
  id: string,
  resolveServices: SettingsServiceResolver,
): Promise<Response> {
  const params = parseRequest(NumberSequenceIdParamSchema, { id });

  const result = await runNumberSequenceApiRoute({
    request,
    route: SETTINGS_ROUTES.generate(id),
    httpMethod: "POST",
    permission: PERMISSIONS.sequences.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.generateNextNumber.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toGenerateNextNumberResponse(
          result.body.data as GenerateNextNumberDto,
        ),
      },
    });
  }

  return toJsonResponse(result);
}
