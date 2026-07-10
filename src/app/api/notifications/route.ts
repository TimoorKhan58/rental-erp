import type { NextRequest } from "next/server";

import { handleListNotifications } from "@/modules/notification/presentation/routes/notification-api.routes";

import { resolveNotificationApplicationServices } from "./_composition/resolve-notification-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListNotifications(request, resolveNotificationApplicationServices);
}
