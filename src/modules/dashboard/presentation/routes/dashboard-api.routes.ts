import type { NextRequest } from "next/server";

import type { DashboardLayoutDto } from "@/modules/dashboard/application/dtos/dashboard.dto";
import type { DashboardServiceResolver } from "@/modules/dashboard/application/services/dashboard-application-services.interface";
import {
  CreateDashboardLayoutSchema,
  UpdateDashboardLayoutSchema,
} from "@/modules/dashboard/application/schemas/dashboard.schemas";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";

import { toDashboardLayoutResponse } from "../mappers/dashboard-response.mapper";
import {
  runDashboardApiRoute,
  toJsonResponse,
} from "../http/dashboard-api.route-runner";
import { DASHBOARD_ROUTES } from "./dashboard.routes";

export async function handleGetDashboardLayout(
  request: NextRequest,
  resolveServices: DashboardServiceResolver,
): Promise<Response> {
  const result = await runDashboardApiRoute({
    request,
    route: DASHBOARD_ROUTES.layout,
    httpMethod: "GET",
    permission: PERMISSIONS.dashboard.read,
    resolveServices,
    handler: async (ctx, services) => services.dashboardService.getLayout(ctx),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toDashboardLayoutResponse(result.body.data as DashboardLayoutDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateDashboardLayout(
  request: NextRequest,
  resolveServices: DashboardServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateDashboardLayoutSchema, body);

  const result = await runDashboardApiRoute({
    request,
    route: DASHBOARD_ROUTES.layout,
    httpMethod: "POST",
    permission: PERMISSIONS.dashboard.update,
    resolveServices,
    handler: async (ctx, services) =>
      services.dashboardService.createLayout(createInput, ctx),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toDashboardLayoutResponse(result.body.data as DashboardLayoutDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateDashboardLayout(
  request: NextRequest,
  resolveServices: DashboardServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateDashboardLayoutSchema, body);

  const result = await runDashboardApiRoute({
    request,
    route: DASHBOARD_ROUTES.layout,
    httpMethod: "PATCH",
    permission: PERMISSIONS.dashboard.update,
    resolveServices,
    handler: async (ctx, services) =>
      services.dashboardService.updateLayout(updateInput, ctx),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toDashboardLayoutResponse(result.body.data as DashboardLayoutDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleResetDashboardLayout(
  request: NextRequest,
  resolveServices: DashboardServiceResolver,
): Promise<Response> {
  const result = await runDashboardApiRoute({
    request,
    route: DASHBOARD_ROUTES.resetLayout,
    httpMethod: "POST",
    permission: PERMISSIONS.dashboard.update,
    resolveServices,
    handler: async (ctx, services) => services.dashboardService.resetLayout(ctx),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toDashboardLayoutResponse(result.body.data as DashboardLayoutDto),
      },
    });
  }

  return toJsonResponse(result);
}
