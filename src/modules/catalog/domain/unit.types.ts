import type { UnitOfMeasureId } from "@/shared/domain/ids";

export interface UnitProps {
  readonly id: UnitOfMeasureId;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateUnitData {
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}

export interface UpdateUnitData {
  readonly code?: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}
