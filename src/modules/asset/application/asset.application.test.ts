import { describe, expect, it, vi } from "vitest";

import { CreateAssetService } from "@/modules/asset/application/services/create-asset.service";
import { UpdateAssetService } from "@/modules/asset/application/services/update-asset.service";
import { GetAssetByIdService } from "@/modules/asset/application/services/get-asset-by-id.service";
import { ListAssetsService } from "@/modules/asset/application/services/list-assets.service";
import { TransferAssetService } from "@/modules/asset/application/services/transfer-asset.service";
import { DisposeAssetService } from "@/modules/asset/application/services/dispose-asset.service";
import { AddMaintenanceHistoryService } from "@/modules/asset/application/services/add-maintenance-history.service";
import {
  ASSET_ENTITY_NAME,
  ASSET_MODULE,
} from "@/modules/asset/application/services/asset-service.constants";
import { createAssetCode } from "@/modules/asset/domain";
import { createWarehouseCode } from "@/modules/warehouse/domain";
import { buildWarehouseEntity } from "@/modules/warehouse/tests/helpers/warehouse.fixtures";
import { InMemoryWarehouseRepository } from "@/modules/warehouse/tests/helpers/in-memory-warehouse.repository";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
} from "@/shared/infrastructure/errors";

import {
  ASSET_ID,
  OTHER_ASSET_ID,
  OTHER_WAREHOUSE_ID,
  USER_ID,
  VALID_CREATE_INPUT,
  VALID_DISPOSE_INPUT,
  VALID_MAINTENANCE_INPUT,
  VALID_TRANSFER_INPUT,
  WAREHOUSE_ID,
  buildAssetEntity,
  buildDisposedAssetEntity,
  buildUnderMaintenanceAssetEntity,
} from "../tests/helpers/asset.fixtures";
import type {
  AddMaintenanceHistoryInput,
  CreateAssetInput,
  DisposeAssetInput,
  TransferAssetInput,
} from "@/modules/asset/application/schemas/asset.schemas";
import { buildCategoryEntity } from "../tests/helpers/asset-category.fixtures";
import { InMemoryAssetRepository } from "../tests/helpers/in-memory-asset.repository";
import { InMemoryAssetCategoryRepository } from "../tests/helpers/in-memory-asset-category.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughAssetTransactionRunner,
  createRollbackAssetTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

const VALID_CREATE_SERVICE_INPUT =
  VALID_CREATE_INPUT as unknown as CreateAssetInput;
const VALID_TRANSFER_SERVICE_INPUT =
  VALID_TRANSFER_INPUT as unknown as TransferAssetInput;
const VALID_DISPOSE_SERVICE_INPUT =
  VALID_DISPOSE_INPUT as unknown as DisposeAssetInput;
const VALID_MAINTENANCE_SERVICE_INPUT =
  VALID_MAINTENANCE_INPUT as unknown as AddMaintenanceHistoryInput;

function createWriteScope(
  assetRepository: InMemoryAssetRepository,
  categoryRepository: InMemoryAssetCategoryRepository,
  warehouseRepository: InMemoryWarehouseRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
) {
  return createPassThroughAssetTransactionRunner({
    assetRepository,
    categoryRepository,
    warehouseRepository,
    auditLogger,
    userId,
  });
}

function seedDependencies(
  assetRepository = new InMemoryAssetRepository(),
  categoryRepository = new InMemoryAssetCategoryRepository(),
  warehouseRepository = new InMemoryWarehouseRepository(),
) {
  categoryRepository.seed([buildCategoryEntity()]);
  warehouseRepository.seed([
    buildWarehouseEntity({ id: WAREHOUSE_ID }),
    buildWarehouseEntity({
      id: OTHER_WAREHOUSE_ID,
      warehouseCode: createWarehouseCode("WH-002"),
      name: "Secondary Hub",
    }),
  ]);

  return { assetRepository, categoryRepository, warehouseRepository };
}

describe("CreateAssetService", () => {
  it("creates an asset and returns a DTO", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    const auditLogger = new MockAuditLogger();
    const service = new CreateAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        auditLogger,
        USER_ID,
      ),
    );

    const result = await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(result.assetCode).toBe("AST-001");
    expect(assetRepository.count()).toBe(1);
  });

  it("rejects duplicate asset code", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildAssetEntity()]);
    const service = new CreateAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("rejects invalid input", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    const service = new CreateAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ ...VALID_CREATE_SERVICE_INPUT, usefulLifeMonths: 0 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects when category does not exist", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    categoryRepository.seed([]);
    const service = new CreateAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects when warehouse does not exist", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    warehouseRepository.seed([]);
    const service = new CreateAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects when user context is missing", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    const service = new CreateAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});

describe("UpdateAssetService", () => {
  it("updates an existing asset", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildAssetEntity()]);
    const service = new UpdateAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: ASSET_ID },
      { name: "Updated Forklift" },
    );

    expect(result.name).toBe("Updated Forklift");
  });

  it("throws when asset does not exist", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    const service = new UpdateAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: ASSET_ID }, { name: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects update on disposed asset", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildDisposedAssetEntity()]);
    const service = new UpdateAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: ASSET_ID }, { name: "Updated" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects when updated category does not exist", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildAssetEntity()]);
    const service = new UpdateAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: ASSET_ID },
        { categoryId: "aa0e8400-e29b-41d4-a716-446655440099" },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("GetAssetByIdService", () => {
  it("returns asset DTO with history", async () => {
    const repository = new InMemoryAssetRepository();
    repository.seed([buildAssetEntity()]);
    const service = new GetAssetByIdService(repository);

    const result = await service.execute({ id: ASSET_ID });

    expect(result.id).toBe(ASSET_ID);
    expect(result.transfers).toEqual([]);
    expect(result.maintenanceHistory).toEqual([]);
  });

  it("throws NotFoundError for missing asset", async () => {
    const service = new GetAssetByIdService(new InMemoryAssetRepository());

    await expect(service.execute({ id: ASSET_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("ListAssetsService", () => {
  it("returns paginated DTOs", async () => {
    const repository = new InMemoryAssetRepository();
    repository.seed([
      buildAssetEntity(),
      buildAssetEntity({
        id: OTHER_ASSET_ID,
        assetCode: createAssetCode("AST-002"),
        name: "Second Asset",
      }),
    ]);
    const service = new ListAssetsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 1,
      sortOrder: "asc",
    });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(2);
  });

  it("filters by status", async () => {
    const repository = new InMemoryAssetRepository();
    repository.seed([
      buildAssetEntity(),
      buildUnderMaintenanceAssetEntity({ id: OTHER_ASSET_ID }),
    ]);
    const service = new ListAssetsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "asc",
      status: "UNDER_MAINTENANCE",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("UNDER_MAINTENANCE");
  });
});

describe("TransferAssetService", () => {
  it("transfers asset to another warehouse", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildAssetEntity()]);
    const service = new TransferAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: ASSET_ID }, VALID_TRANSFER_SERVICE_INPUT);

    expect(result.warehouseId).toBe(OTHER_WAREHOUSE_ID);
    expect(assetRepository.transferCount(ASSET_ID)).toBe(1);
  });

  it("rejects transfer to same warehouse", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildAssetEntity()]);
    const service = new TransferAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute(
        { id: ASSET_ID },
        { ...VALID_TRANSFER_SERVICE_INPUT, toWarehouseId: WAREHOUSE_ID },
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects transfer without user context", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildAssetEntity()]);
    const service = new TransferAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
      ),
    );

    await expect(
      service.execute({ id: ASSET_ID }, VALID_TRANSFER_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects transfer on disposed asset", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildDisposedAssetEntity()]);
    const service = new TransferAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: ASSET_ID }, VALID_TRANSFER_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("DisposeAssetService", () => {
  it("disposes an active asset", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildAssetEntity()]);
    const service = new DisposeAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute({ id: ASSET_ID }, VALID_DISPOSE_SERVICE_INPUT);

    expect(result.status).toBe("DISPOSED");
    expect(result.disposalAmount).toBe("25000.00");
  });

  it("rejects dispose without user context", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildAssetEntity()]);
    const service = new DisposeAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
      ),
    );

    await expect(
      service.execute({ id: ASSET_ID }, VALID_DISPOSE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects dispose on already disposed asset", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildDisposedAssetEntity()]);
    const service = new DisposeAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: ASSET_ID }, VALID_DISPOSE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("AddMaintenanceHistoryService", () => {
  it("adds maintenance history and updates status", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildAssetEntity()]);
    const service = new AddMaintenanceHistoryService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    const result = await service.execute(
      { id: ASSET_ID },
      VALID_MAINTENANCE_SERVICE_INPUT,
    );

    expect(result.status).toBe("UNDER_MAINTENANCE");
    expect(assetRepository.maintenanceCount(ASSET_ID)).toBe(1);
  });

  it("rejects maintenance on disposed asset", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildDisposedAssetEntity()]);
    const service = new AddMaintenanceHistoryService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
        USER_ID,
      ),
    );

    await expect(
      service.execute({ id: ASSET_ID }, VALID_MAINTENANCE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects maintenance without user context", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildAssetEntity()]);
    const service = new AddMaintenanceHistoryService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        new MockAuditLogger(),
      ),
    );

    await expect(
      service.execute({ id: ASSET_ID }, VALID_MAINTENANCE_SERVICE_INPUT),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("Asset application audit behavior", () => {
  it("writes CREATE audit on success", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    const auditLogger = new MockAuditLogger();
    const service = new CreateAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("CREATE");
    expect(auditLogger.entries[0]?.module).toBe(ASSET_MODULE);
    expect(auditLogger.entries[0]?.entityName).toBe(ASSET_ENTITY_NAME);
  });

  it("writes UPDATE audit with old and new values", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildAssetEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await service.execute({ id: ASSET_ID }, { name: "Updated Forklift" });

    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
    expect(auditLogger.entries[0]?.oldValues).toMatchObject({
      name: "Forklift Model X",
    });
    expect(auditLogger.entries[0]?.newValues).toMatchObject({
      name: "Updated Forklift",
    });
  });

  it("does not write audit when create fails validation", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    const auditLogger = new MockAuditLogger();
    const service = new CreateAssetService(
      createWriteScope(
        assetRepository,
        categoryRepository,
        warehouseRepository,
        auditLogger,
        USER_ID,
      ),
    );

    await expect(
      service.execute({ ...VALID_CREATE_SERVICE_INPUT, assetCode: "" }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("Asset application transaction behavior", () => {
  it("commits successful writes", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    const auditLogger = new MockAuditLogger();
    const service = new CreateAssetService(
      createRollbackAssetTransactionRunner(
        assetRepository,
        auditLogger,
        {
          categoryRepository,
          warehouseRepository,
          userId: USER_ID,
        },
      ),
    );

    await service.execute(VALID_CREATE_SERVICE_INPUT);

    expect(assetRepository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(1);
  });

  it("rolls back data and audit when write fails", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildAssetEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateAssetService(
      createRollbackAssetTransactionRunner(
        assetRepository,
        auditLogger,
        {
          categoryRepository,
          warehouseRepository,
          userId: USER_ID,
        },
      ),
    );

    await expect(service.execute(VALID_CREATE_SERVICE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );

    expect(assetRepository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(0);
  });

  it("rolls back transfer when audit logging fails", async () => {
    const { assetRepository, categoryRepository, warehouseRepository } =
      seedDependencies();
    assetRepository.seed([buildAssetEntity()]);
    const auditLogger = new MockAuditLogger();
    auditLogger.log = vi.fn(async () => {
      throw new Error("audit failed");
    });
    const service = new TransferAssetService(
      createRollbackAssetTransactionRunner(
        assetRepository,
        auditLogger,
        {
          categoryRepository,
          warehouseRepository,
          userId: USER_ID,
        },
      ),
    );

    await expect(
      service.execute({ id: ASSET_ID }, VALID_TRANSFER_SERVICE_INPUT),
    ).rejects.toThrow("audit failed");

    const asset = await assetRepository.findById(ASSET_ID);
    expect(asset?.warehouseId).toBe(WAREHOUSE_ID);
    expect(assetRepository.transferCount(ASSET_ID)).toBe(0);
  });
});
