import type { Return } from "@/modules/return/domain";

export function toReturnAuditValues(returnRecord: Return): Record<string, unknown> {
  const props = returnRecord.toProps();

  return {
    returnNumber: props.returnNumber,
    rentalOrderId: props.rentalOrderId,
    dispatchId: props.dispatchId,
    status: props.status,
    returnDate: props.returnDate.toISOString(),
    itemCount: props.items.length,
    lostQuantity: props.items.reduce((sum, item) => sum + item.lostQuantity, 0),
    sourceQuantities: props.items.map((item) => ({
      rentalOrderItemId: item.rentalOrderItemId,
      returnedQuantity: item.returnedQuantity,
      ownedQuantity: item.ownedQuantity,
      externalQuantity: item.externalQuantity,
      goodQuantity: item.goodQuantity,
      damagedQuantity: item.damagedQuantity,
      lostQuantity: item.lostQuantity,
      missingQuantity: item.missingQuantity,
      ownedGoodQuantity: item.ownedGoodQuantity,
      ownedDamagedQuantity: item.ownedDamagedQuantity,
      ownedLostQuantity: item.ownedLostQuantity,
      externalGoodQuantity: item.externalGoodQuantity,
      externalDamagedQuantity: item.externalDamagedQuantity,
      externalLostQuantity: item.externalLostQuantity,
    })),
  };
}
