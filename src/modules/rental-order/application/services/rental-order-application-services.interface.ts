import type { PaginatedResult } from "@/shared/domain/pagination";

import type { RentalOrderDto } from "../dtos/rental-order.dto";
import type {
  CreateRentalOrderInput,
  RentalOrderIdParamInput,
  ReserveRentalOrderInput,
  UpdateRentalOrderInput,
} from "../schemas/rental-order.schemas";
import type { ListRentalOrdersInput } from "../schemas/list-rental-orders.schema";
import type { CancelRentalOrderService } from "./cancel-rental-order.service";
import type { ConfirmRentalOrderService } from "./confirm-rental-order.service";
import type { CreateRentalOrderService } from "./create-rental-order.service";
import type { GetRentalOrderByIdService } from "./get-rental-order-by-id.service";
import type { ListRentalOrdersService } from "./list-rental-orders.service";
import type { ReserveRentalOrderService } from "./reserve-rental-order.service";
import type { UpdateRentalOrderService } from "./update-rental-order.service";

export interface RentalOrderApplicationServices {
  getRentalOrderById: GetRentalOrderByIdService;
  listRentalOrders: ListRentalOrdersService;
  createRentalOrder: CreateRentalOrderService;
  updateRentalOrder: UpdateRentalOrderService;
  confirmRentalOrder: ConfirmRentalOrderService;
  reserveRentalOrder: ReserveRentalOrderService;
  cancelRentalOrder: CancelRentalOrderService;
}

export type RentalOrderServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => RentalOrderApplicationServices;

export interface IRentalOrderService {
  getById(params: RentalOrderIdParamInput): Promise<RentalOrderDto>;
  list(input: ListRentalOrdersInput): Promise<PaginatedResult<RentalOrderDto>>;
  create(input: CreateRentalOrderInput): Promise<RentalOrderDto>;
  update(
    params: RentalOrderIdParamInput,
    input: UpdateRentalOrderInput,
  ): Promise<RentalOrderDto>;
  confirm(params: RentalOrderIdParamInput): Promise<RentalOrderDto>;
  reserve(
    params: RentalOrderIdParamInput,
    input: ReserveRentalOrderInput,
  ): Promise<RentalOrderDto>;
  cancel(params: RentalOrderIdParamInput): Promise<RentalOrderDto>;
}
