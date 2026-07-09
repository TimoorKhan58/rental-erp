import type { NextRequest } from "next/server";

import { handleVoidJournalEntry } from "@/modules/accounting/presentation/routes/journal-entry-api.routes";

import { resolveAccountingApplicationServices } from "../../../accounts/_composition/resolve-accounting-services";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleVoidJournalEntry(
    request,
    id,
    resolveAccountingApplicationServices,
  );
}
