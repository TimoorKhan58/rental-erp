import type { NextRequest } from "next/server";

import type { NotificationDto } from "@/modules/notification/application/dtos/notification.dto";
import type { NotificationServiceResolver } from "@/modules/notification/application/services/notification-application-services.interface";
import {
  ListNotificationsSchema,
  NotificationIdParamSchema,
} from "@/modules/notification/application/schemas/notification.schemas";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toMarkAllNotificationsReadResponse,
  toNotificationListResponse,
  toNotificationResponse,
} from "../mappers/notification-response.mapper";
import {
  runNotificationApiRoute,
  toJsonResponse,
} from "../http/notification-api.route-runner";
import { NOTIFICATION_ROUTES } from "./notification.routes";

function parseQuery(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

export async function handleListNotifications(
  request: NextRequest,
  resolveServices: NotificationServiceResolver,
): Promise<Response> {
  const listInput = parseRequest(ListNotificationsSchema, parseQuery(request));

  const result = await runNotificationApiRoute({
    request,
    route: NOTIFICATION_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.notifications.read,
    resolveServices,
    handler: async (ctx, services) =>
      services.notificationService.list(listInput, ctx),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<NotificationDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toNotificationListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetNotificationById(
  request: NextRequest,
  id: string,
  resolveServices: NotificationServiceResolver,
): Promise<Response> {
  const params = parseRequest(NotificationIdParamSchema, { id });

  const result = await runNotificationApiRoute({
    request,
    route: NOTIFICATION_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.notifications.read,
    resolveServices,
    handler: async (ctx, services) =>
      services.notificationService.getById(params, ctx),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toNotificationResponse(result.body.data as NotificationDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleMarkNotificationRead(
  request: NextRequest,
  id: string,
  resolveServices: NotificationServiceResolver,
): Promise<Response> {
  const params = parseRequest(NotificationIdParamSchema, { id });

  const result = await runNotificationApiRoute({
    request,
    route: NOTIFICATION_ROUTES.markRead(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.notifications.read,
    resolveServices,
    handler: async (ctx, services) =>
      services.notificationService.markRead(params, ctx),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toNotificationResponse(result.body.data as NotificationDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleMarkAllNotificationsRead(
  request: NextRequest,
  resolveServices: NotificationServiceResolver,
): Promise<Response> {
  const result = await runNotificationApiRoute({
    request,
    route: NOTIFICATION_ROUTES.markAllRead,
    httpMethod: "PATCH",
    permission: PERMISSIONS.notifications.read,
    resolveServices,
    handler: async (ctx, services) =>
      services.notificationService.markAllRead(ctx),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toMarkAllNotificationsReadResponse(
          result.body.data as { markedCount: number },
        ),
      },
    });
  }

  return toJsonResponse(result);
}
