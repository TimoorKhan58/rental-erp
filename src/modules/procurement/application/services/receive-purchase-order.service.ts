import { postPurchaseReceivedJournal } from "@/modules/accounting/application/services/operational-journal-posting.service";
import { toUserId } from "@/modules/accounting/application/mappers/journal-entry.mapper";
import { PURCHASE_ORDER_REFERENCE_TYPE } from "@/modules/procurement/domain/purchase-order.constants";
import {
  PurchaseOrderInvalidReceiveError,
  PurchaseOrderInvalidStatusError,
} from "@/modules/procurement/domain/purchase-order.errors";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { PurchaseOrderDto } from "../dtos/purchase-order.dto";
import {
  toProductId,
  toPurchaseOrderDto,
  toPurchaseOrderId,
} from "../mappers/purchase-order.mapper";
import {
  PurchaseOrderIdParamSchema,
  ReceivePurchaseOrderSchema,
  type PurchaseOrderIdParamInput,
  type ReceivePurchaseOrderInput,
} from "../schemas/purchase-order.schemas";
import { toPurchaseOrderAuditValues } from "./purchase-order-audit.mapper";
import {
  PURCHASE_ORDER_ENTITY_NAME,
  PURCHASE_ORDER_MODULE,
} from "./purchase-order-service.constants";
import type { IPurchaseOrderTransactionRunner } from "./purchase-order-transaction.runner";

export class ReceivePurchaseOrderService {
  constructor(
    private readonly transactionRunner: IPurchaseOrderTransactionRunner,
  ) {}

  async execute(
    params: PurchaseOrderIdParamInput,
    input: ReceivePurchaseOrderInput,
  ): Promise<PurchaseOrderDto> {
    const { id } = parseRequest(PurchaseOrderIdParamSchema, params);
    const data = parseRequest(ReceivePurchaseOrderSchema, input);

    return this.transactionRunner.run(
      async ({
        purchaseOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        accountRepository,
        journalEntryRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to receive purchase order",
          });
        }

        const existing = await purchaseOrderRepository.findById(
          toPurchaseOrderId(id),
        );

        if (existing === null) {
          throw new NotFoundError({
            message: "Purchase order not found",
            details: { id },
          });
        }

        let receivedOrder;

        try {
          receivedOrder = existing.withReceived(
            data.items.map((item) => ({
              productId: toProductId(item.productId),
              quantity: item.quantity,
            })),
          );
        } catch (error) {
          if (
            error instanceof PurchaseOrderInvalidStatusError ||
            error instanceof PurchaseOrderInvalidReceiveError
          ) {
            throw new UnprocessableError({
              message: error.message,
              details:
                error instanceof PurchaseOrderInvalidReceiveError &&
                error.productId !== undefined
                  ? { productId: error.productId }
                  : undefined,
            });
          }

          throw error;
        }

        const previousValues = toPurchaseOrderAuditValues(existing);
        const updated = await purchaseOrderRepository.updateReceive(
          existing.id,
          {
            status: receivedOrder.status,
            items: receivedOrder.items.map((item) => ({
              id: item.id,
              receivedQuantity: item.receivedQuantity,
            })),
          },
        );

        for (const receiveItem of data.items) {
          const productId = toProductId(receiveItem.productId);
          let inventory = await inventoryRepository.findByProductAndWarehouse(
            productId,
            existing.warehouseId,
          );

          if (inventory === null) {
            // Auto-create a baseline inventory record so first-time procurement
            // receipts can post stock movement without a manual inventory setup step.
            inventory = await inventoryRepository.create({
              productId,
              warehouseId: existing.warehouseId,
              quantityOnHand: 0,
              reservedQuantity: 0,
              minimumStock: 0,
              maximumStock: null,
              isActive: true,
            });
          }

          await executeCreateStockMovementInScope(
            {
              stockMovementRepository,
              inventoryRepository,
              auditLogger,
              userId,
            },
            {
              inventoryId: inventory.id,
              movementType: "IN",
              quantity: receiveItem.quantity,
              referenceType: PURCHASE_ORDER_REFERENCE_TYPE,
              referenceId: existing.id,
              remarks: `Received from PO ${existing.poNumber}`,
            },
          );
        }

        // Books: the delivered items are equipment we now own, owed to the
        // supplier until paid (2026-11-19 audit; purchases were not posted).
        const costByProduct = new Map(existing.items.map((item) => [String(item.productId), item.unitCost]));
        const receivedValue = data.items.reduce(
          (total, item) => total + item.quantity * (costByProduct.get(item.productId) ?? 0),
          0,
        );
        await postPurchaseReceivedJournal(
          { accountRepository, journalEntryRepository, userId: toUserId(userId) },
          {
            purchaseOrderId: existing.id,
            poNumber: existing.poNumber,
            receivedDate: new Date(),
            amount: Math.round(receivedValue * 100) / 100,
          },
        );

        await auditLogger.log({
          module: PURCHASE_ORDER_MODULE,
          entityName: PURCHASE_ORDER_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toPurchaseOrderAuditValues(updated),
        });

        return toPurchaseOrderDto(updated);
      },
    );
  }
}
