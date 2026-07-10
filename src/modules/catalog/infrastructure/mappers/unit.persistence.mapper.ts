import type { Prisma } from "@/generated/prisma/client";
import { Unit } from "@/modules/catalog/domain/unit.entity";
import type {
  CreateUnitData,
  UpdateUnitData,
} from "@/modules/catalog/domain/unit.types";
import type { UnitOfMeasureId } from "@/shared/domain/ids";

export function toUnitDomain(record: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Unit {
  return Unit.reconstitute({
    id: record.id as UnitOfMeasureId,
    code: record.code,
    name: record.name,
    description: record.description,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toUnitCreateInput(
  data: CreateUnitData,
): Prisma.UnitOfMeasureCreateInput {
  const normalized = Unit.create(data);

  return {
    code: normalized.code,
    name: normalized.name,
    description: normalized.description,
    isActive: normalized.isActive,
  };
}

export function toUnitUpdateInput(
  data: UpdateUnitData,
): Prisma.UnitOfMeasureUpdateInput {
  return {
    ...(data.code !== undefined ? { code: data.code } : {}),
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
}
