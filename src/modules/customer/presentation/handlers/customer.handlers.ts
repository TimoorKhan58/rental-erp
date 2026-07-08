import type { ExecutionContext } from "@/shared/application/context";

import type { CustomerDto } from "@/modules/customer/application/dtos/customer.dto";
import type {
  CreateCustomerInput,
  CustomerIdParamInput,
  UpdateCustomerInput,
} from "@/modules/customer/application/schemas/customer.schemas";

/**
 * Route handler placeholders — API endpoints will be implemented in Phase 5-002.
 */

export type CustomerRouteHandler<TInput, TResult> = (
  ctx: ExecutionContext,
  input: TInput,
) => Promise<TResult>;

export const getCustomerByIdHandler: CustomerRouteHandler<
  CustomerIdParamInput,
  CustomerDto
> = async (ctx, input) => {
  void ctx;
  void input;
  throw new Error("getCustomerByIdHandler is not implemented — Phase 5-002");
};

export const createCustomerHandler: CustomerRouteHandler<
  CreateCustomerInput,
  CustomerDto
> = async (ctx, input) => {
  void ctx;
  void input;
  throw new Error("createCustomerHandler is not implemented — Phase 5-002");
};

export const updateCustomerHandler: CustomerRouteHandler<
  { params: CustomerIdParamInput; body: UpdateCustomerInput },
  CustomerDto
> = async (ctx, input) => {
  void ctx;
  void input;
  throw new Error("updateCustomerHandler is not implemented — Phase 5-002");
};

export const deleteCustomerHandler: CustomerRouteHandler<
  CustomerIdParamInput,
  void
> = async (ctx, input) => {
  void ctx;
  void input;
  throw new Error("deleteCustomerHandler is not implemented — Phase 5-002");
};
