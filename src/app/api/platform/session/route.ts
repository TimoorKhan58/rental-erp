import type { NextRequest } from "next/server";

import { runPlatformRoute } from "@/modules/platform/presentation/http/platform-route";

/** Who is signed in to the platform area (404 for everyone else). */
export async function GET(request: NextRequest): Promise<Response> {
  return runPlatformRoute(request, "session.read", async (ctx) => ({
    email: ctx.owner.email,
    name: ctx.owner.name,
  }));
}
