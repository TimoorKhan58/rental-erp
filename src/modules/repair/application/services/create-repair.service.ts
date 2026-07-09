import { Repair, RepairInvariantError } from "@/modules/repair/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { RepairDto } from "../dtos/repair.dto";
import {
  toCreateRepairData,
  toRepairDto,
  toReturnId,
  toUserId,
} from "../mappers/repair.mapper";
import {
  CreateRepairSchema,
  type CreateRepairInput,
} from "../schemas/repair.schemas";
import { toRepairAuditValues } from "./repair-audit.mapper";
import {
  loadPriorRepairsForReturn,
  validateRepairAgainstReturnItem,
  validateReturnForRepair,
} from "./repair-return.validation";
import {
  REPAIR_ENTITY_NAME,
  REPAIR_MODULE,
} from "./repair-service.constants";
import type { IRepairTransactionRunner } from "./repair-transaction.runner";

export class CreateRepairService {
  constructor(
    private readonly transactionRunner: IRepairTransactionRunner,
  ) {}

  async execute(input: CreateRepairInput): Promise<RepairDto> {
    const data = parseRequest(CreateRepairSchema, input);

    return this.transactionRunner.run(
      async ({
        repairRepository,
        returnRepository,
        rentalOrderRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to create repair",
          });
        }

        const createData = toCreateRepairData(data, toUserId(userId));

        try {
          Repair.create(createData);
        } catch (error) {
          if (error instanceof RepairInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const returnRecord = await returnRepository.findById(
          toReturnId(data.returnId),
        );

        if (returnRecord === null) {
          throw new NotFoundError({
            message: "Return not found",
            details: { returnId: data.returnId },
          });
        }

        validateReturnForRepair(returnRecord);

        const rentalOrder = await rentalOrderRepository.findById(
          returnRecord.rentalOrderId,
        );

        if (rentalOrder === null) {
          throw new NotFoundError({
            message: "Rental order not found",
            details: { rentalOrderId: returnRecord.rentalOrderId },
          });
        }

        const returnItem = returnRecord.items.find(
          (item) => item.id === data.returnItemId,
        );

        if (returnItem === undefined) {
          throw new NotFoundError({
            message: "Return item not found",
            details: { returnItemId: data.returnItemId },
          });
        }

        const rentalOrderItem = rentalOrder.items.find(
          (item) => item.id === returnItem.rentalOrderItemId,
        );

        if (rentalOrderItem === undefined) {
          throw new NotFoundError({
            message: "Rental order item not found",
            details: { rentalOrderItemId: returnItem.rentalOrderItemId },
          });
        }

        if (rentalOrderItem.productId !== createData.productId) {
          throw new UnprocessableError({
            message: "Product does not match return item",
            details: { productId: createData.productId },
          });
        }

        if (rentalOrder.warehouseId !== createData.warehouseId) {
          throw new UnprocessableError({
            message: "Warehouse does not match rental order",
            details: { warehouseId: createData.warehouseId },
          });
        }

        const priorRepairs = await loadPriorRepairsForReturn(
          repairRepository,
          returnRecord.id,
        );

        validateRepairAgainstReturnItem(
          returnRecord,
          data.returnItemId,
          createData.productId,
          createData.warehouseId,
          createData.quantity,
          priorRepairs,
        );

        const existing = await repairRepository.findByRepairNumber(
          createData.repairNumber,
        );

        if (existing !== null) {
          throw new ConflictError({
            message: "Repair number already exists",
            details: { repairNumber: createData.repairNumber },
          });
        }

        const repair = await repairRepository.create(createData);

        await auditLogger.log({
          module: REPAIR_MODULE,
          entityName: REPAIR_ENTITY_NAME,
          recordId: repair.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toRepairAuditValues(repair),
        });

        return toRepairDto(repair);
      },
    );
  }
}
