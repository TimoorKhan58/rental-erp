import { describe, expect, it } from "vitest";

import {
  assertCanAddMaintenance,
  assertCanDispose,
  assertCanTransfer,
  assertCanUpdate,
  assertValidStatusTransition,
  AssetInvalidStatusError,
} from "@/modules/asset/domain";

import {
  OTHER_WAREHOUSE_ID,
  USER_ID,
  VALID_DISPOSE_INPUT,
  VALID_MAINTENANCE_INPUT,
  VALID_TRANSFER_INPUT,
  buildAssetEntity,
  buildDisposedAssetEntity,
  buildUnderMaintenanceAssetEntity,
} from "../tests/helpers/asset.fixtures";

describe("status transition guards", () => {
  it("assertCanUpdate allows active", () => {
    expect(() => assertCanUpdate("ACTIVE")).not.toThrow();
  });

  it("assertCanUpdate allows under maintenance", () => {
    expect(() => assertCanUpdate("UNDER_MAINTENANCE")).not.toThrow();
  });

  it("assertCanUpdate rejects disposed", () => {
    expect(() => assertCanUpdate("DISPOSED")).toThrow(AssetInvalidStatusError);
  });

  it("assertCanTransfer allows active", () => {
    expect(() => assertCanTransfer("ACTIVE")).not.toThrow();
  });

  it("assertCanTransfer rejects under maintenance", () => {
    expect(() => assertCanTransfer("UNDER_MAINTENANCE")).toThrow(
      AssetInvalidStatusError,
    );
  });

  it("assertCanTransfer rejects disposed", () => {
    expect(() => assertCanTransfer("DISPOSED")).toThrow(
      AssetInvalidStatusError,
    );
  });

  it("assertCanDispose allows active", () => {
    expect(() => assertCanDispose("ACTIVE")).not.toThrow();
  });

  it("assertCanDispose rejects under maintenance", () => {
    expect(() => assertCanDispose("UNDER_MAINTENANCE")).toThrow(
      AssetInvalidStatusError,
    );
  });

  it("assertCanAddMaintenance allows active", () => {
    expect(() => assertCanAddMaintenance("ACTIVE")).not.toThrow();
  });

  it("assertCanAddMaintenance allows under maintenance", () => {
    expect(() => assertCanAddMaintenance("UNDER_MAINTENANCE")).not.toThrow();
  });

  it("assertCanAddMaintenance rejects disposed", () => {
    expect(() => assertCanAddMaintenance("DISPOSED")).toThrow(
      AssetInvalidStatusError,
    );
  });
});

describe("valid status transitions", () => {
  it("allows active to under maintenance", () => {
    expect(() =>
      assertValidStatusTransition("ACTIVE", "UNDER_MAINTENANCE"),
    ).not.toThrow();
  });

  it("allows active to disposed", () => {
    expect(() =>
      assertValidStatusTransition("ACTIVE", "DISPOSED"),
    ).not.toThrow();
  });

  it("allows under maintenance to active", () => {
    expect(() =>
      assertValidStatusTransition("UNDER_MAINTENANCE", "ACTIVE"),
    ).not.toThrow();
  });

  it("rejects disposed to active", () => {
    expect(() =>
      assertValidStatusTransition("DISPOSED", "ACTIVE"),
    ).toThrow(AssetInvalidStatusError);
  });
});

describe("asset entity status methods", () => {
  it("withTransferred updates warehouse and keeps active", () => {
    const asset = buildAssetEntity();
    const transferred = asset.withTransferred({
      toWarehouseId: OTHER_WAREHOUSE_ID,
      transferDate: new Date(VALID_TRANSFER_INPUT.transferDate),
      reason: VALID_TRANSFER_INPUT.reason,
      transferredById: USER_ID,
    });

    expect(transferred.warehouseId).toBe(OTHER_WAREHOUSE_ID);
    expect(transferred.status).toBe("ACTIVE");
  });

  it("withDisposed sets disposal fields", () => {
    const asset = buildAssetEntity();
    const disposed = asset.withDisposed({
      disposalDate: new Date(VALID_DISPOSE_INPUT.disposalDate),
      disposalAmount: VALID_DISPOSE_INPUT.disposalAmount,
      disposalReason: VALID_DISPOSE_INPUT.disposalReason,
      disposedById: USER_ID,
    });

    expect(disposed.status).toBe("DISPOSED");
    expect(disposed.disposalAmount).toBe(VALID_DISPOSE_INPUT.disposalAmount);
    expect(disposed.disposedById).toBe(USER_ID);
  });

  it("withMaintenanceStatus sets under maintenance when requested", () => {
    const asset = buildAssetEntity();
    const updated = asset.withMaintenanceStatus({
      serviceDate: new Date(VALID_MAINTENANCE_INPUT.serviceDate),
      vendor: VALID_MAINTENANCE_INPUT.vendor,
      cost: VALID_MAINTENANCE_INPUT.cost,
      description: VALID_MAINTENANCE_INPUT.description,
      completedById: USER_ID,
      setUnderMaintenance: true,
    });

    expect(updated.status).toBe("UNDER_MAINTENANCE");
  });

  it("withMaintenanceStatus keeps status when not requested", () => {
    const asset = buildUnderMaintenanceAssetEntity();
    const updated = asset.withMaintenanceStatus({
      serviceDate: new Date(VALID_MAINTENANCE_INPUT.serviceDate),
      cost: VALID_MAINTENANCE_INPUT.cost,
      description: VALID_MAINTENANCE_INPUT.description,
      completedById: USER_ID,
      setUnderMaintenance: false,
    });

    expect(updated.status).toBe("UNDER_MAINTENANCE");
  });

  it("rejects transfer on disposed asset", () => {
    const disposed = buildDisposedAssetEntity();

    expect(() =>
      disposed.withTransferred({
        toWarehouseId: OTHER_WAREHOUSE_ID,
        transferDate: new Date(),
        transferredById: USER_ID,
      }),
    ).toThrow(AssetInvalidStatusError);
  });

  it("rejects update on disposed asset", () => {
    const disposed = buildDisposedAssetEntity();

    expect(() => disposed.withUpdated({ name: "Updated" })).toThrow(
      AssetInvalidStatusError,
    );
  });
});
