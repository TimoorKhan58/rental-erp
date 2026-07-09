import type { NextRequest } from "next/server";

import type { FinancialReportServiceResolver } from "@/modules/financial-report/application/services/financial-report-application-services.interface";
import {
  AccountLedgerQuerySchema,
  AccountsSummaryQuerySchema,
  BalanceSheetQuerySchema,
  CashFlowSummaryQuerySchema,
  ExpenseSummaryQuerySchema,
  GeneralLedgerQuerySchema,
  JournalReportQuerySchema,
  ProfitLossQuerySchema,
  RevenueSummaryQuerySchema,
  TrialBalanceQuerySchema,
} from "@/modules/financial-report/application/schemas/financial-report.schemas";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";

import {
  toAccountLedgerResponse,
  toAccountsSummaryResponse,
  toBalanceSheetResponse,
  toCashFlowSummaryResponse,
  toExpenseSummaryResponse,
  toGeneralLedgerResponse,
  toJournalReportResponse,
  toProfitLossResponse,
  toRevenueSummaryResponse,
  toTrialBalanceResponse,
} from "../mappers/financial-report-response.mapper";
import {
  runFinancialReportApiRoute,
  toJsonResponse,
} from "../http/financial-report-api.route-runner";
import { FINANCIAL_REPORT_ROUTES } from "./financial-report.routes";

function parseQuery(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

export async function handleGetTrialBalance(
  request: NextRequest,
  resolveServices: FinancialReportServiceResolver,
): Promise<Response> {
  const input = parseRequest(TrialBalanceQuerySchema, parseQuery(request));

  const result = await runFinancialReportApiRoute({
    request,
    route: FINANCIAL_REPORT_ROUTES.trialBalance,
    httpMethod: "GET",
    permission: PERMISSIONS.financialReports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getTrialBalance.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toTrialBalanceResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetBalanceSheet(
  request: NextRequest,
  resolveServices: FinancialReportServiceResolver,
): Promise<Response> {
  const input = parseRequest(BalanceSheetQuerySchema, parseQuery(request));

  const result = await runFinancialReportApiRoute({
    request,
    route: FINANCIAL_REPORT_ROUTES.balanceSheet,
    httpMethod: "GET",
    permission: PERMISSIONS.financialReports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getBalanceSheet.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toBalanceSheetResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetProfitLoss(
  request: NextRequest,
  resolveServices: FinancialReportServiceResolver,
): Promise<Response> {
  const input = parseRequest(ProfitLossQuerySchema, parseQuery(request));

  const result = await runFinancialReportApiRoute({
    request,
    route: FINANCIAL_REPORT_ROUTES.profitLoss,
    httpMethod: "GET",
    permission: PERMISSIONS.financialReports.read,
    resolveServices,
    handler: async (_ctx, services) => services.getProfitLoss.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toProfitLossResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetGeneralLedger(
  request: NextRequest,
  resolveServices: FinancialReportServiceResolver,
): Promise<Response> {
  const input = parseRequest(GeneralLedgerQuerySchema, parseQuery(request));

  const result = await runFinancialReportApiRoute({
    request,
    route: FINANCIAL_REPORT_ROUTES.generalLedger,
    httpMethod: "GET",
    permission: PERMISSIONS.financialReports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getGeneralLedger.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toGeneralLedgerResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetAccountLedger(
  request: NextRequest,
  resolveServices: FinancialReportServiceResolver,
): Promise<Response> {
  const input = parseRequest(AccountLedgerQuerySchema, parseQuery(request));

  const result = await runFinancialReportApiRoute({
    request,
    route: FINANCIAL_REPORT_ROUTES.accountLedger,
    httpMethod: "GET",
    permission: PERMISSIONS.financialReports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getAccountLedger.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAccountLedgerResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetJournalReport(
  request: NextRequest,
  resolveServices: FinancialReportServiceResolver,
): Promise<Response> {
  const input = parseRequest(JournalReportQuerySchema, parseQuery(request));

  const result = await runFinancialReportApiRoute({
    request,
    route: FINANCIAL_REPORT_ROUTES.journals,
    httpMethod: "GET",
    permission: PERMISSIONS.financialReports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getJournalReport.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toJournalReportResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetCashFlowSummary(
  request: NextRequest,
  resolveServices: FinancialReportServiceResolver,
): Promise<Response> {
  const input = parseRequest(CashFlowSummaryQuerySchema, parseQuery(request));

  const result = await runFinancialReportApiRoute({
    request,
    route: FINANCIAL_REPORT_ROUTES.cashFlow,
    httpMethod: "GET",
    permission: PERMISSIONS.financialReports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getCashFlowSummary.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toCashFlowSummaryResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetRevenueSummary(
  request: NextRequest,
  resolveServices: FinancialReportServiceResolver,
): Promise<Response> {
  const input = parseRequest(RevenueSummaryQuerySchema, parseQuery(request));

  const result = await runFinancialReportApiRoute({
    request,
    route: FINANCIAL_REPORT_ROUTES.revenue,
    httpMethod: "GET",
    permission: PERMISSIONS.financialReports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getRevenueSummary.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRevenueSummaryResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetExpenseSummary(
  request: NextRequest,
  resolveServices: FinancialReportServiceResolver,
): Promise<Response> {
  const input = parseRequest(ExpenseSummaryQuerySchema, parseQuery(request));

  const result = await runFinancialReportApiRoute({
    request,
    route: FINANCIAL_REPORT_ROUTES.expenses,
    httpMethod: "GET",
    permission: PERMISSIONS.financialReports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getExpenseSummary.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toExpenseSummaryResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetAccountsSummary(
  request: NextRequest,
  resolveServices: FinancialReportServiceResolver,
): Promise<Response> {
  const input = parseRequest(AccountsSummaryQuerySchema, parseQuery(request));

  const result = await runFinancialReportApiRoute({
    request,
    route: FINANCIAL_REPORT_ROUTES.accounts,
    httpMethod: "GET",
    permission: PERMISSIONS.financialReports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getAccountsSummary.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAccountsSummaryResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}
