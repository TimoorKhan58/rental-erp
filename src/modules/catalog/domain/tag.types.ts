import type { ProductTagId } from "@/shared/domain/ids";

export interface TagProps {
  readonly id: ProductTagId;
  readonly name: string;
  readonly color: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateTagData {
  readonly name: string;
  readonly color?: string | null;
  readonly isActive?: boolean;
}

export interface UpdateTagData {
  readonly name?: string;
  readonly color?: string | null;
  readonly isActive?: boolean;
}
