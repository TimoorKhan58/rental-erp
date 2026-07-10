import type { ProductAttributeId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { AttributeDataType } from "./attribute.constants";
import type {
  AttributeProps,
  CreateAttributeData,
  UpdateAttributeData,
} from "./attribute.types";
import {
  normalizeRequiredText,
  validateAttributeDataType,
} from "./attribute.rules";

export class Attribute implements Entity<ProductAttributeId> {
  readonly id: ProductAttributeId;
  readonly name: string;
  readonly dataType: AttributeDataType;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: AttributeProps) {
    this.id = props.id;
    this.name = normalizeRequiredText(props.name, "name");
    this.dataType = validateAttributeDataType(props.dataType);
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    data: CreateAttributeData,
  ): Omit<AttributeProps, "id" | "createdAt" | "updatedAt"> {
    return {
      name: normalizeRequiredText(data.name, "name"),
      dataType: validateAttributeDataType(data.dataType ?? "TEXT"),
      isActive: data.isActive ?? true,
    };
  }

  static reconstitute(props: AttributeProps): Attribute {
    return new Attribute(props);
  }

  toProps(): AttributeProps {
    return {
      id: this.id,
      name: this.name,
      dataType: this.dataType,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export function toUpdatedAttributeProps(
  attribute: Attribute,
  data: UpdateAttributeData,
): AttributeProps {
  return {
    ...attribute.toProps(),
    name:
      data.name !== undefined
        ? normalizeRequiredText(data.name, "name")
        : attribute.name,
    dataType:
      data.dataType !== undefined
        ? validateAttributeDataType(data.dataType)
        : attribute.dataType,
    isActive: data.isActive ?? attribute.isActive,
    updatedAt: new Date(),
  };
}
