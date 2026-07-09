import type { NextRequest } from "next/server";

import type { ReportingServiceResolver } from "@/modules/reporting/application/services/reporting-application-services.interface";
import {
  CustomerReportQuerySchema,
  DashboardQuerySchema,
  DispatchReportQuerySchema,
  InventoryReportQuerySchema,
  MaintenanceReportQuerySchema,
  ProcurementReportQuerySchema,
  ProductReportQuerySchema,
  RentalReportQuerySchema,
  RepairReportQuerySchema,
  ReturnReportQuerySchema,
  SupplierReportQuerySchema,
  WarehouseReportQuerySchema,
} from "@/modules/reporting/application/schemas/reporting.schemas";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";

import {
  toCustomerReportResponse,
  toDashboardResponse,
  toDispatchReportResponse,
  toInventoryReportResponse,
  toMaintenanceReportResponse,
  toProcurementReportResponse,
  toProductReportResponse,
  toRentalReportResponse,
  toRepairReportResponse,
  toReturnReportResponse,
  toSupplierReportResponse,
  toWarehouseReportResponse,
} from "../mappers/reporting-response.mapper";
import {
  runReportingApiRoute,
  toJsonResponse,
} from "../http/reporting-api.route-runner";
import { REPORTING_ROUTES } from "./reporting.routes";

function parseQuery(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

export async function handleGetDashboard(
  request: NextRequest,
  resolveServices: ReportingServiceResolver,
): Promise<Response> {
  const input = parseRequest(DashboardQuerySchema, parseQuery(request));

  const result = await runReportingApiRoute({
    request,
    route: REPORTING_ROUTES.dashboard,
    httpMethod: "GET",
    permission: PERMISSIONS.reports.read,
    resolveServices,
    handler: async (_ctx, services) => services.getDashboard.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toDashboardResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetInventoryReport(
  request: NextRequest,
  resolveServices: ReportingServiceResolver,
): Promise<Response> {
  const input = parseRequest(InventoryReportQuerySchema, parseQuery(request));

  const result = await runReportingApiRoute({
    request,
    route: REPORTING_ROUTES.inventory,
    httpMethod: "GET",
    permission: PERMISSIONS.reports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getInventoryReport.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toInventoryReportResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetRentalReport(
  request: NextRequest,
  resolveServices: ReportingServiceResolver,
): Promise<Response> {
  const input = parseRequest(RentalReportQuerySchema, parseQuery(request));

  const result = await runReportingApiRoute({
    request,
    route: REPORTING_ROUTES.rentals,
    httpMethod: "GET",
    permission: PERMISSIONS.reports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getRentalReport.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRentalReportResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetDispatchReport(
  request: NextRequest,
  resolveServices: ReportingServiceResolver,
): Promise<Response> {
  const input = parseRequest(DispatchReportQuerySchema, parseQuery(request));

  const result = await runReportingApiRoute({
    request,
    route: REPORTING_ROUTES.dispatches,
    httpMethod: "GET",
    permission: PERMISSIONS.reports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getDispatchReport.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toDispatchReportResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetReturnReport(
  request: NextRequest,
  resolveServices: ReportingServiceResolver,
): Promise<Response> {
  const input = parseRequest(ReturnReportQuerySchema, parseQuery(request));

  const result = await runReportingApiRoute({
    request,
    route: REPORTING_ROUTES.returns,
    httpMethod: "GET",
    permission: PERMISSIONS.reports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getReturnReport.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toReturnReportResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetRepairReport(
  request: NextRequest,
  resolveServices: ReportingServiceResolver,
): Promise<Response> {
  const input = parseRequest(RepairReportQuerySchema, parseQuery(request));

  const result = await runReportingApiRoute({
    request,
    route: REPORTING_ROUTES.repairs,
    httpMethod: "GET",
    permission: PERMISSIONS.reports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getRepairReport.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toRepairReportResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetMaintenanceReport(
  request: NextRequest,
  resolveServices: ReportingServiceResolver,
): Promise<Response> {
  const input = parseRequest(MaintenanceReportQuerySchema, parseQuery(request));

  const result = await runReportingApiRoute({
    request,
    route: REPORTING_ROUTES.maintenance,
    httpMethod: "GET",
    permission: PERMISSIONS.reports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getMaintenanceReport.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toMaintenanceReportResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetProcurementReport(
  request: NextRequest,
  resolveServices: ReportingServiceResolver,
): Promise<Response> {
  const input = parseRequest(ProcurementReportQuerySchema, parseQuery(request));

  const result = await runReportingApiRoute({
    request,
    route: REPORTING_ROUTES.procurement,
    httpMethod: "GET",
    permission: PERMISSIONS.reports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getProcurementReport.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toProcurementReportResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetCustomerReport(
  request: NextRequest,
  resolveServices: ReportingServiceResolver,
): Promise<Response> {
  const input = parseRequest(CustomerReportQuerySchema, parseQuery(request));

  const result = await runReportingApiRoute({
    request,
    route: REPORTING_ROUTES.customers,
    httpMethod: "GET",
    permission: PERMISSIONS.reports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getCustomerReport.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toCustomerReportResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetSupplierReport(
  request: NextRequest,
  resolveServices: ReportingServiceResolver,
): Promise<Response> {
  const input = parseRequest(SupplierReportQuerySchema, parseQuery(request));

  const result = await runReportingApiRoute({
    request,
    route: REPORTING_ROUTES.suppliers,
    httpMethod: "GET",
    permission: PERMISSIONS.reports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getSupplierReport.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toSupplierReportResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetWarehouseReport(
  request: NextRequest,
  resolveServices: ReportingServiceResolver,
): Promise<Response> {
  const input = parseRequest(WarehouseReportQuerySchema, parseQuery(request));

  const result = await runReportingApiRoute({
    request,
    route: REPORTING_ROUTES.warehouses,
    httpMethod: "GET",
    permission: PERMISSIONS.reports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getWarehouseReport.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toWarehouseReportResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetProductReport(
  request: NextRequest,
  resolveServices: ReportingServiceResolver,
): Promise<Response> {
  const input = parseRequest(ProductReportQuerySchema, parseQuery(request));

  const result = await runReportingApiRoute({
    request,
    route: REPORTING_ROUTES.products,
    httpMethod: "GET",
    permission: PERMISSIONS.reports.read,
    resolveServices,
    handler: async (_ctx, services) =>
      services.getProductReport.execute(input),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toProductReportResponse(result.body.data as never),
      },
    });
  }

  return toJsonResponse(result);
}
