import type { ProductTagId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { CreateTagData, TagProps, UpdateTagData } from "./tag.types";
import {
  normalizeRequiredText,
  normalizeTagColor,
} from "./tag.rules";

export class Tag implements Entity<ProductTagId> {
  readonly id: ProductTagId;
  readonly name: string;
  readonly color: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: TagProps) {
    this.id = props.id;
    this.name = normalizeRequiredText(props.name, "name");
    this.color = normalizeTagColor(props.color);
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    data: CreateTagData,
  ): Omit<TagProps, "id" | "createdAt" | "updatedAt"> {
    return {
      name: normalizeRequiredText(data.name, "name"),
      color: normalizeTagColor(data.color),
      isActive: data.isActive ?? true,
    };
  }

  static reconstitute(props: TagProps): Tag {
    return new Tag(props);
  }

  toProps(): TagProps {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export function toUpdatedTagProps(tag: Tag, data: UpdateTagData): TagProps {
  return {
    ...tag.toProps(),
    name:
      data.name !== undefined
        ? normalizeRequiredText(data.name, "name")
        : tag.name,
    color:
      data.color !== undefined ? normalizeTagColor(data.color) : tag.color,
    isActive: data.isActive ?? tag.isActive,
    updatedAt: new Date(),
  };
}
