import type { UnitOfMeasureId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { CreateUnitData, UnitProps, UpdateUnitData } from "./unit.types";
import {
  normalizeOptionalText,
  normalizeRequiredText,
  normalizeUnitCode,
} from "./unit.rules";

export class Unit implements Entity<UnitOfMeasureId> {
  readonly id: UnitOfMeasureId;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: UnitProps) {
    this.id = props.id;
    this.code = normalizeUnitCode(props.code);
    this.name = normalizeRequiredText(props.name, "name");
    this.description = normalizeOptionalText(props.description);
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    data: CreateUnitData,
  ): Omit<UnitProps, "id" | "createdAt" | "updatedAt"> {
    return {
      code: normalizeUnitCode(data.code),
      name: normalizeRequiredText(data.name, "name"),
      description: normalizeOptionalText(data.description),
      isActive: data.isActive ?? true,
    };
  }

  static reconstitute(props: UnitProps): Unit {
    return new Unit(props);
  }

  toProps(): UnitProps {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      description: this.description,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export function toUpdatedUnitProps(
  unit: Unit,
  data: UpdateUnitData,
): UnitProps {
  return {
    ...unit.toProps(),
    code:
      data.code !== undefined ? normalizeUnitCode(data.code) : unit.code,
    name:
      data.name !== undefined
        ? normalizeRequiredText(data.name, "name")
        : unit.name,
    description:
      data.description !== undefined
        ? normalizeOptionalText(data.description)
        : unit.description,
    isActive: data.isActive ?? unit.isActive,
    updatedAt: new Date(),
  };
}
