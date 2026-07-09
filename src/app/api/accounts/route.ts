import type { NextRequest } from "next/server";

import {
  handleCreateAccount,
  handleListAccounts,
} from "@/modules/accounting/presentation/routes/account-api.routes";

import { resolveAccountingApplicationServices } from "./_composition/resolve-accounting-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListAccounts(request, resolveAccountingApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateAccount(request, resolveAccountingApplicationServices);
}
