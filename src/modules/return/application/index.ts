export type {
  CreateReturnDto,
  CreateReturnItemDto,
  InspectReturnDto,
  InspectReturnItemDto,
  ReturnDto,
  ReturnIdParamDto,
  ReturnItemDto,
  UpdateReturnDto,
} from "./dtos/return.dto";
export { toReturnListQuery } from "./mappers/return-list.mapper";
export {
  toCreateReturnData,
  toDispatchId,
  toInspectReturnItems,
  toProductId,
  toReturnDto,
  toReturnId,
  toRentalOrderId,
  toUpdateReturnData,
  toUserId,
} from "./mappers/return.mapper";
export {
  CreateReturnSchema,
  InspectReturnSchema,
  ReturnIdParamSchema,
  UpdateReturnSchema,
  type CreateReturnInput,
  type InspectReturnInput,
  type ReturnIdParamInput,
  type UpdateReturnInput,
} from "./schemas/return.schemas";
export {
  ListReturnsSchema,
  type ListReturnsInput,
} from "./schemas/list-returns.schema";
export {
  RETURN_CONDITIONS,
  RETURN_ENTITY_NAME,
  RETURN_MODULE,
  RETURN_SEARCH_FIELDS,
  RETURN_SORT_FIELDS,
  RETURN_STATUSES,
  type ReturnCondition,
  type ReturnSortField,
  type ReturnStatus,
} from "@/modules/return/domain";
export type {
  ReturnApplicationServices,
  IReturnService,
  ReturnServiceResolver,
} from "./services/return-application-services.interface";
export type {
  IReturnTransactionRunner,
  ReturnWriteScope,
} from "./services/return-transaction.runner";
export { CancelReturnService } from "./services/cancel-return.service";
export { CompleteReturnService } from "./services/complete-return.service";
export { CreateReturnService } from "./services/create-return.service";
export { GetReturnByIdService } from "./services/get-return-by-id.service";
export { InspectReturnService } from "./services/inspect-return.service";
export { ListReturnsService } from "./services/list-returns.service";
export { ReceiveReturnService } from "./services/receive-return.service";
export { ReturnService } from "./services/return.service";
export { UpdateReturnService } from "./services/update-return.service";
