import type { BrandId } from "@/shared/domain/ids";

export interface BrandProps {
  readonly id: BrandId;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateBrandData {
  readonly name: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}

export interface UpdateBrandData {
  readonly name?: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}
