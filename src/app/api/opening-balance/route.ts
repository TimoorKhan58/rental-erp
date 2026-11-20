import type { NextRequest } from "next/server";

import type { OpeningBalanceService } from "@/modules/accounting/application/services/opening-balance.service";
import {
  runAccountingApiRoute,
  toJsonResponse,
} from "@/modules/accounting/presentation/http/accounting-api.route-runner";
import { PERMISSIONS } from "@/shared/application/authorization";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import { runCatchingApiHandler } from "@/shared/infrastructure/http/run-catching-api-handler";

import { resolveAccountingApplicationServices } from "../accounts/_composition/resolve-accounting-services";

const ROUTE = "/api/opening-balance";

function openingBalanceService(services: { openingBalance?: OpeningBalanceService }): OpeningBalanceService {
  if (services.openingBalance === undefined) {
    throw new UnprocessableError({ message: "Opening balance is not available" });
  }
  return services.openingBalance;
}

/** The business's opening balance (owner's capital), or null. */
export async function GET(request: NextRequest): Promise<Response> {
  return runCatchingApiHandler(request, async () =>
    toJsonResponse(
      await runAccountingApiRoute({
        request,
        route: ROUTE,
        httpMethod: "GET",
        permission: PERMISSIONS.journalEntries.read,
        resolveServices: resolveAccountingApplicationServices,
        handler: async (_ctx, services) => openingBalanceService(services).get(),
      }),
    ),
  );
}

/** Records the opening balance, replacing any earlier one. */
export async function POST(request: NextRequest): Promise<Response> {
  return runCatchingApiHandler(request, async () => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return toJsonResponse(
      await runAccountingApiRoute({
        request,
        route: ROUTE,
        httpMethod: "POST",
        permission: PERMISSIONS.journalEntries.post,
        resolveServices: resolveAccountingApplicationServices,
        handler: async (_ctx, services) => openingBalanceService(services).record(body as never),
      }),
    );
  });
}
