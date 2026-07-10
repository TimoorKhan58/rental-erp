import { Prisma as PrismaNamespace } from "@/generated/prisma/client";
import { DEFAULT_DASHBOARD_CODE } from "@/modules/dashboard/domain/dashboard.constants";
import { DashboardDefaultNotFoundError, DashboardLayoutNotFoundError } from "@/modules/dashboard/domain/dashboard.errors";
import { normalizeCreateDashboardLayoutData } from "@/modules/dashboard/domain/dashboard.rules";
import type {
  CreateDashboardLayoutData,
  DashboardLayoutContent,
} from "@/modules/dashboard/domain/dashboard.types";
import type { IDashboardLayoutRepository } from "@/modules/dashboard/domain/dashboard.repository.interface";
import type { DashboardLayout } from "@/modules/dashboard/domain/dashboard-layout.entity";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import { repositoryFindFirst } from "@/shared/infrastructure/database";

import {
  toCreateDashboardLayoutPersistence,
  toCustomLayoutJson,
  toDashboardLayoutDomain,
  toDefaultDashboardTemplate,
  toUpdateDashboardLayoutPersistence,
} from "../mappers/dashboard.persistence.mapper";

const MODEL = "UserDashboard";

const DEFAULT_DASHBOARD_INCLUDE = {
  widgets: {
    orderBy: [
      { row: "asc" as const },
      { column: "asc" as const },
    ],
  },
};

export class PrismaDashboardLayoutRepository implements IDashboardLayoutRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  private async loadDefaultDashboardTemplate() {
    return this.runner.run(async (db) => {
      const dashboard = await db.dashboard.findFirst({
        where: {
          code: DEFAULT_DASHBOARD_CODE,
          enabled: true,
        },
        include: DEFAULT_DASHBOARD_INCLUDE,
      });

      return dashboard ? toDefaultDashboardTemplate(dashboard) : null;
    }, { model: MODEL, operation: "findDefaultDashboardTemplate" });
  }

  findDefaultDashboardTemplate() {
    return this.loadDefaultDashboardTemplate();
  }

  findByUserId(userId: string): Promise<DashboardLayout | null> {
    return repositoryFindFirst(
      this.runner,
      async (db) => {
        const [defaultTemplate, record] = await Promise.all([
          this.loadDefaultDashboardTemplate(),
          db.userDashboard.findFirst({
            where: {
              userId,
              dashboard: {
                code: DEFAULT_DASHBOARD_CODE,
                enabled: true,
              },
            },
            include: {
              dashboard: true,
            },
          }),
        ]);

        if (defaultTemplate === null || record === null) {
          return null;
        }

        return toDashboardLayoutDomain(record, record.dashboard, defaultTemplate);
      },
      { model: MODEL, operation: "findByUserId" },
    );
  }

  async create(
    userId: string,
    data: CreateDashboardLayoutData,
  ): Promise<DashboardLayout> {
    const defaultTemplate = await this.loadDefaultDashboardTemplate();

    if (defaultTemplate === null) {
      throw new DashboardDefaultNotFoundError();
    }

    const layout = toCreateDashboardLayoutPersistence(
      normalizeCreateDashboardLayoutData(data),
    );

    return this.runner.run(async (db) => {
      const record = await db.userDashboard.create({
        data: {
          userId,
          dashboardId: defaultTemplate.id,
          isDefault: true,
          customLayout: toCustomLayoutJson(layout),
        },
        include: {
          dashboard: true,
        },
      });

      return toDashboardLayoutDomain(record, record.dashboard, defaultTemplate);
    }, { model: MODEL, operation: "create" });
  }

  async update(
    userId: string,
    layout: DashboardLayoutContent,
  ): Promise<DashboardLayout> {
    const defaultTemplate = await this.loadDefaultDashboardTemplate();

    if (defaultTemplate === null) {
      throw new DashboardDefaultNotFoundError();
    }

    const normalizedLayout = toUpdateDashboardLayoutPersistence(layout);

    return this.runner.run(async (db) => {
      const existing = await db.userDashboard.findFirst({
        where: {
          userId,
          dashboard: {
            code: DEFAULT_DASHBOARD_CODE,
            enabled: true,
          },
        },
      });

      if (existing === null) {
        throw new DashboardLayoutNotFoundError(userId);
      }

      const record = await db.userDashboard.update({
        where: { id: existing.id },
        data: {
          customLayout: toCustomLayoutJson(normalizedLayout),
        },
        include: {
          dashboard: true,
        },
      });

      return toDashboardLayoutDomain(record, record.dashboard, defaultTemplate);
    }, { model: MODEL, operation: "update" });
  }

  async reset(userId: string): Promise<DashboardLayout> {
    const defaultTemplate = await this.loadDefaultDashboardTemplate();

    if (defaultTemplate === null) {
      throw new DashboardDefaultNotFoundError();
    }

    return this.runner.run(async (db) => {
      const existing = await db.userDashboard.findFirst({
        where: {
          userId,
          dashboard: {
            code: DEFAULT_DASHBOARD_CODE,
            enabled: true,
          },
        },
      });

      if (existing === null) {
        throw new DashboardLayoutNotFoundError(userId);
      }

      const record = await db.userDashboard.update({
        where: { id: existing.id },
        data: {
          customLayout: PrismaNamespace.DbNull,
        },
        include: {
          dashboard: true,
        },
      });

      return toDashboardLayoutDomain(record, record.dashboard, defaultTemplate);
    }, { model: MODEL, operation: "reset" });
  }
}
