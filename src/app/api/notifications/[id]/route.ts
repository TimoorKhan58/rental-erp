import type { NextRequest } from "next/server";

import { handleGetNotificationById } from "@/modules/notification/presentation/routes/notification-api.routes";

import { resolveNotificationApplicationServices } from "../_composition/resolve-notification-services";

interface NotificationRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: NotificationRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetNotificationById(
    request,
    id,
    resolveNotificationApplicationServices,
  );
}
