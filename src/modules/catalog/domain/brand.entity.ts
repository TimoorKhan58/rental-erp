import type { BrandId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type {
  BrandProps,
  CreateBrandData,
  UpdateBrandData,
} from "./brand.types";
import { normalizeOptionalText, normalizeRequiredText } from "./brand.rules";

export class Brand implements Entity<BrandId> {
  readonly id: BrandId;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: BrandProps) {
    this.id = props.id;
    this.name = normalizeRequiredText(props.name, "name");
    this.description = normalizeOptionalText(props.description);
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    data: CreateBrandData,
  ): Omit<BrandProps, "id" | "createdAt" | "updatedAt"> {
    return {
      name: normalizeRequiredText(data.name, "name"),
      description: normalizeOptionalText(data.description),
      isActive: data.isActive ?? true,
    };
  }

  static reconstitute(props: BrandProps): Brand {
    return new Brand(props);
  }

  toProps(): BrandProps {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export function toUpdatedBrandProps(
  brand: Brand,
  data: UpdateBrandData,
): BrandProps {
  return {
    ...brand.toProps(),
    name:
      data.name !== undefined
        ? normalizeRequiredText(data.name, "name")
        : brand.name,
    description:
      data.description !== undefined
        ? normalizeOptionalText(data.description)
        : brand.description,
    isActive: data.isActive ?? brand.isActive,
    updatedAt: new Date(),
  };
}
