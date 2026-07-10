import type { ProductAttributeId } from "@/shared/domain/ids";

import type { AttributeDataType } from "./attribute.constants";

export interface AttributeProps {
  readonly id: ProductAttributeId;
  readonly name: string;
  readonly dataType: AttributeDataType;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateAttributeData {
  readonly name: string;
  readonly dataType?: AttributeDataType;
  readonly isActive?: boolean;
}

export interface UpdateAttributeData {
  readonly name?: string;
  readonly dataType?: AttributeDataType;
  readonly isActive?: boolean;
}
