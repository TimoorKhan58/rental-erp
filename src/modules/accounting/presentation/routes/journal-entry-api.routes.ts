import type { NextRequest } from "next/server";

import type { AccountingServiceResolver } from "@/modules/accounting/application/services/accounting-application-services.interface";
import type { JournalEntryDto } from "@/modules/accounting/application/dtos/journal-entry.dto";
import {
  CreateJournalEntrySchema,
  JournalEntryIdParamSchema,
  UpdateJournalEntrySchema,
} from "@/modules/accounting/application";
import { ListJournalEntriesSchema } from "@/modules/accounting/application/schemas/list-journal-entries.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toJournalEntryListResponse,
  toJournalEntryResponse,
} from "../mappers/journal-entry-response.mapper";
import {
  runAccountingApiRoute,
  toJsonResponse,
} from "../http/accounting-api.route-runner";
import { JOURNAL_ENTRY_ROUTES } from "../routes/journal-entry.routes";

export async function handleListJournalEntries(
  request: NextRequest,
  resolveServices: AccountingServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListJournalEntriesSchema, query);

  const result = await runAccountingApiRoute({
    request,
    route: JOURNAL_ENTRY_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.journalEntries.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.listJournalEntries.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<JournalEntryDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toJournalEntryListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateJournalEntry(
  request: NextRequest,
  resolveServices: AccountingServiceResolver,
): Promise<Response> {
  const body = await request.json();
  const createInput = parseRequest(CreateJournalEntrySchema, body);

  const result = await runAccountingApiRoute({
    request,
    route: JOURNAL_ENTRY_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.journalEntries.create,
    resolveServices,
    handler: async (_ctx, services) =>
      services.createJournalEntry.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toJournalEntryResponse(result.body.data as JournalEntryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetJournalEntryById(
  request: NextRequest,
  id: string,
  resolveServices: AccountingServiceResolver,
): Promise<Response> {
  const params = parseRequest(JournalEntryIdParamSchema, { id });

  const result = await runAccountingApiRoute({
    request,
    route: JOURNAL_ENTRY_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.journalEntries.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getJournalEntryById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toJournalEntryResponse(result.body.data as JournalEntryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateJournalEntry(
  request: NextRequest,
  id: string,
  resolveServices: AccountingServiceResolver,
): Promise<Response> {
  const params = parseRequest(JournalEntryIdParamSchema, { id });
  const body = await request.json();
  const updateInput = parseRequest(UpdateJournalEntrySchema, body);

  const result = await runAccountingApiRoute({
    request,
    route: JOURNAL_ENTRY_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.journalEntries.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateJournalEntry.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toJournalEntryResponse(result.body.data as JournalEntryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handlePostJournalEntry(
  request: NextRequest,
  id: string,
  resolveServices: AccountingServiceResolver,
): Promise<Response> {
  const params = parseRequest(JournalEntryIdParamSchema, { id });

  const result = await runAccountingApiRoute({
    request,
    route: JOURNAL_ENTRY_ROUTES.post(id),
    httpMethod: "POST",
    permission: PERMISSIONS.journalEntries.post,
    resolveServices,
    handler: async (_ctx, services) =>
      services.postJournalEntry.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toJournalEntryResponse(result.body.data as JournalEntryDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleVoidJournalEntry(
  request: NextRequest,
  id: string,
  resolveServices: AccountingServiceResolver,
): Promise<Response> {
  const params = parseRequest(JournalEntryIdParamSchema, { id });

  const result = await runAccountingApiRoute({
    request,
    route: JOURNAL_ENTRY_ROUTES.void(id),
    httpMethod: "POST",
    permission: PERMISSIONS.journalEntries.void,
    resolveServices,
    handler: async (_ctx, services) =>
      services.voidJournalEntry.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toJournalEntryResponse(result.body.data as JournalEntryDto),
      },
    });
  }

  return toJsonResponse(result);
}
