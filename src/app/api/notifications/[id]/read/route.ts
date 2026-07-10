import type { NextRequest } from "next/server";

import { handleMarkNotificationRead } from "@/modules/notification/presentation/routes/notification-api.routes";

import { resolveNotificationApplicationServices } from "../../_composition/resolve-notification-services";

interface NotificationReadRouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  context: NotificationReadRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleMarkNotificationRead(
    request,
    id,
    resolveNotificationApplicationServices,
  );
}
