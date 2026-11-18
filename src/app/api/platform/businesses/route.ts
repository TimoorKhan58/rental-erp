import type { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { CreateBusinessSchema } from "@/modules/platform/application/platform-business.schemas";
import { createBusiness, listBusinesses } from "@/modules/platform/infrastructure/platform-businesses";
import { runPlatformRoute } from "@/modules/platform/presentation/http/platform-route";
import { parseRequest } from "@/shared/application/validation";

/** Every business with its owner and activity (platform owners only). */
export async function GET(request: NextRequest): Promise<Response> {
  return runPlatformRoute(request, "businesses.list", () => listBusinesses(prisma));
}

/** Create a business, its starter kit and its owner login. */
export async function POST(request: NextRequest): Promise<Response> {
  return runPlatformRoute(request, "businesses.create", async (ctx) => {
    const input = parseRequest(CreateBusinessSchema, await request.json().catch(() => ({})));
    const created = await createBusiness(prisma, input);

    // The temporary password is never written to the audit log.
    await ctx.audit({
      action: "business.created",
      targetOrganizationId: created.id,
      details: { name: input.name, slug: input.slug, ownerEmail: input.owner.email },
    });

    return created;
  });
}
