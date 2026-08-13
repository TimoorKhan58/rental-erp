export type RentalOrderItemShortfallDto = {
  rentalOrderItemId: string;
  productId: string;
  requiredQuantity: number;
  ownedFulfillableQuantity: number;
  dateAwareAvailableQuantity: number;
  shortfallQuantity: number;
  alreadyExternallyRequestedQuantity: number;
  remainingShortfallQuantity: number;
  canSourceExternally: boolean;
  hireStartDate: string;
  hireEndDate: string;
};

export type RentalOrderShortfallDto = {
  rentalOrderId: string;
  orderNumber: string;
  status: string;
  warehouseId: string;
  startDate: string;
  endDate: string;
  activeExternalRentalAgreementId: string | null;
  hasActiveExternalRentalAgreement: boolean;
  canSourceExternally: boolean;
  items: RentalOrderItemShortfallDto[];
};
