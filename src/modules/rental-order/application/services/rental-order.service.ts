import type { PaginatedResult } from "@/shared/domain/pagination";

import type { RentalOrderDto } from "../dtos/rental-order.dto";
import type {
  CreateRentalOrderInput,
  RentalOrderIdParamInput,
  ReserveRentalOrderInput,
  UpdateRentalOrderInput,
} from "../schemas/rental-order.schemas";
import type { ListRentalOrdersInput } from "../schemas/list-rental-orders.schema";
import type { IRentalOrderService } from "./rental-order-application-services.interface";
import type { CancelRentalOrderService } from "./cancel-rental-order.service";
import type { ConfirmRentalOrderService } from "./confirm-rental-order.service";
import type { CreateRentalOrderService } from "./create-rental-order.service";
import type { GetRentalOrderByIdService } from "./get-rental-order-by-id.service";
import type { ListRentalOrdersService } from "./list-rental-orders.service";
import type { ReserveRentalOrderService } from "./reserve-rental-order.service";
import type { UpdateRentalOrderService } from "./update-rental-order.service";

export class RentalOrderService implements IRentalOrderService {
  constructor(
    private readonly getRentalOrderById: GetRentalOrderByIdService,
    private readonly listRentalOrders: ListRentalOrdersService,
    private readonly createRentalOrder: CreateRentalOrderService,
    private readonly updateRentalOrder: UpdateRentalOrderService,
    private readonly confirmRentalOrder: ConfirmRentalOrderService,
    private readonly reserveRentalOrder: ReserveRentalOrderService,
    private readonly cancelRentalOrder: CancelRentalOrderService,
  ) {}

  getById(params: RentalOrderIdParamInput): Promise<RentalOrderDto> {
    return this.getRentalOrderById.execute(params);
  }

  list(input: ListRentalOrdersInput): Promise<PaginatedResult<RentalOrderDto>> {
    return this.listRentalOrders.execute(input);
  }

  create(input: CreateRentalOrderInput): Promise<RentalOrderDto> {
    return this.createRentalOrder.execute(input);
  }

  update(
    params: RentalOrderIdParamInput,
    input: UpdateRentalOrderInput,
  ): Promise<RentalOrderDto> {
    return this.updateRentalOrder.execute(params, input);
  }

  confirm(params: RentalOrderIdParamInput): Promise<RentalOrderDto> {
    return this.confirmRentalOrder.execute(params);
  }

  reserve(
    params: RentalOrderIdParamInput,
    input: ReserveRentalOrderInput,
  ): Promise<RentalOrderDto> {
    return this.reserveRentalOrder.execute(params, input);
  }

  cancel(params: RentalOrderIdParamInput): Promise<RentalOrderDto> {
    return this.cancelRentalOrder.execute(params);
  }
}
