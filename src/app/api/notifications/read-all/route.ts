import type { NextRequest } from "next/server";

import { handleMarkAllNotificationsRead } from "@/modules/notification/presentation/routes/notification-api.routes";

import { resolveNotificationApplicationServices } from "../_composition/resolve-notification-services";

export async function PATCH(request: NextRequest): Promise<Response> {
  return handleMarkAllNotificationsRead(
    request,
    resolveNotificationApplicationServices,
  );
}
