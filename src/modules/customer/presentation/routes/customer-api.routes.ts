import type { NextRequest } from "next/server";

import type { CustomerServiceResolver } from "@/modules/customer/application/services/customer-application-services.interface";
import type { CustomerDto } from "@/modules/customer/application/dtos/customer.dto";
import {
  CreateCustomerSchema,
  CustomerIdParamSchema,
  UpdateCustomerSchema,
} from "@/modules/customer/application";
import { ListCustomersSchema } from "@/modules/customer/application/schemas/list-customers.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toCustomerListResponse,
  toCustomerResponse,
} from "../mappers/customer-response.mapper";
import {
  runCustomerApiRoute,
  toJsonResponse,
} from "../http/customer-api.route-runner";
import { CUSTOMER_ROUTES } from "../routes/customer.routes";

export async function handleListCustomers(
  request: NextRequest,
  resolveServices: CustomerServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListCustomersSchema, query);

  const result = await runCustomerApiRoute({
    request,
    route: CUSTOMER_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.customers.read,
    resolveServices,
    handler: async (_ctx, services) => services.listCustomers.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<CustomerDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toCustomerListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateCustomer(
  request: NextRequest,
  resolveServices: CustomerServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateCustomerSchema, body);

  const result = await runCustomerApiRoute({
    request,
    route: CUSTOMER_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.customers.create,
    resolveServices,
    handler: async (_ctx, services) => services.createCustomer.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toCustomerResponse(result.body.data as CustomerDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetCustomerById(
  request: NextRequest,
  id: string,
  resolveServices: CustomerServiceResolver,
): Promise<Response> {
  const params = parseRequest(CustomerIdParamSchema, { id });

  const result = await runCustomerApiRoute({
    request,
    route: CUSTOMER_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.customers.read,
    resolveServices,
    handler: async (_ctx, services) => services.getCustomerById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toCustomerResponse(result.body.data as CustomerDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateCustomer(
  request: NextRequest,
  id: string,
  resolveServices: CustomerServiceResolver,
): Promise<Response> {
  const params = parseRequest(CustomerIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateCustomerSchema, body);

  const result = await runCustomerApiRoute({
    request,
    route: CUSTOMER_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.customers.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateCustomer.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toCustomerResponse(result.body.data as CustomerDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDeleteCustomer(
  request: NextRequest,
  id: string,
  resolveServices: CustomerServiceResolver,
): Promise<Response> {
  const params = parseRequest(CustomerIdParamSchema, { id });

  const result = await runCustomerApiRoute({
    request,
    route: CUSTOMER_ROUTES.byId(id),
    httpMethod: "DELETE",
    permission: PERMISSIONS.customers.delete,
    resolveServices,
    handler: async (_ctx, services) => {
      await services.deleteCustomer.execute(params);
      return null;
    },
  });

  return toJsonResponse(result);
}
