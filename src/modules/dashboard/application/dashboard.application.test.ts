import { describe, expect, it } from "vitest";

import { MockAuditLogger } from "@/modules/customer/tests/helpers/mock-audit-logger";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";

import { CreateDashboardLayoutService } from "./services/create-dashboard-layout.service";
import { GetDashboardLayoutService } from "./services/get-dashboard-layout.service";
import { ResetDashboardLayoutService } from "./services/reset-dashboard-layout.service";
import { UpdateDashboardLayoutService } from "./services/update-dashboard-layout.service";
import {
  DASHBOARD_USER_ID,
  InMemoryDashboardLayoutRepository,
  sampleDashboardLayoutContent,
} from "../tests/helpers/in-memory-dashboard-layout.repository";
import { createDashboardPassThroughRunner } from "../tests/helpers/dashboard-transaction-test-runner";

describe("GetDashboardLayoutService", () => {
  it("returns layout DTO when user has a saved layout", async () => {
    const repository = new InMemoryDashboardLayoutRepository();
    repository.seedLayout(DASHBOARD_USER_ID);
    const service = new GetDashboardLayoutService(repository);

    const result = await service.execute(DASHBOARD_USER_ID);

    expect(result.userId).toBe(DASHBOARD_USER_ID);
    expect(result.layout.widgets).toHaveLength(1);
    expect(result.layout.widgets[0]?.widgetId).toBe("summary-kpis");
  });

  it("throws NotFoundError when layout is missing", async () => {
    const repository = new InMemoryDashboardLayoutRepository();
    const service = new GetDashboardLayoutService(repository);

    await expect(service.execute(DASHBOARD_USER_ID)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("CreateDashboardLayoutService", () => {
  it("creates a layout when none exists and default template is configured", async () => {
    const repository = new InMemoryDashboardLayoutRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateDashboardLayoutService(
      createDashboardPassThroughRunner(repository, auditLogger),
    );

    const result = await service.execute(DASHBOARD_USER_ID, {
      layout: sampleDashboardLayoutContent(),
    });

    expect(result.userId).toBe(DASHBOARD_USER_ID);
    expect(result.isCustomized).toBe(true);
    expect(auditLogger.entries).toHaveLength(1);
  });

  it("rejects duplicate layout for the same user", async () => {
    const repository = new InMemoryDashboardLayoutRepository();
    repository.seedLayout(DASHBOARD_USER_ID);
    const auditLogger = new MockAuditLogger();
    const service = new CreateDashboardLayoutService(
      createDashboardPassThroughRunner(repository, auditLogger),
    );

    await expect(
      service.execute(DASHBOARD_USER_ID, {
        layout: sampleDashboardLayoutContent(),
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws NotFoundError when default dashboard template is missing", async () => {
    const repository = new InMemoryDashboardLayoutRepository();
    repository.setDefaultTemplate(null);
    const auditLogger = new MockAuditLogger();
    const service = new CreateDashboardLayoutService(
      createDashboardPassThroughRunner(repository, auditLogger),
    );

    await expect(
      service.execute(DASHBOARD_USER_ID, {
        layout: sampleDashboardLayoutContent(),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("UpdateDashboardLayoutService", () => {
  it("updates widget visibility on an existing layout", async () => {
    const repository = new InMemoryDashboardLayoutRepository();
    repository.seedLayout(DASHBOARD_USER_ID);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateDashboardLayoutService(
      createDashboardPassThroughRunner(repository, auditLogger),
    );

    const result = await service.execute(DASHBOARD_USER_ID, {
      layout: {
        widgets: [
          {
            widgetId: "summary-kpis",
            row: 0,
            column: 0,
            width: 12,
            height: 2,
            visible: false,
          },
        ],
      },
    });

    expect(result.layout.widgets[0]?.visible).toBe(false);
  });
});

describe("ResetDashboardLayoutService", () => {
  it("resets customized layout to the default template", async () => {
    const repository = new InMemoryDashboardLayoutRepository();
    repository.seedLayout(DASHBOARD_USER_ID, {
      ...sampleDashboardLayoutContent(),
      theme: "dark",
    });
    const auditLogger = new MockAuditLogger();
    const service = new ResetDashboardLayoutService(
      createDashboardPassThroughRunner(repository, auditLogger),
    );

    const result = await service.execute(DASHBOARD_USER_ID);

    expect(result.isCustomized).toBe(false);
    expect(result.layout.theme).toBe("light");
  });
});
