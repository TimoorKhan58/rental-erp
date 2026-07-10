import type { Brand } from "@/shared/domain/ids";

import { AssetInvariantError } from "../asset.errors";

export type AssetCode = Brand<string, "AssetCode">;

export function createAssetCode(value: string): AssetCode {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new AssetInvariantError("Asset code is required", "assetCode");
  }

  if (trimmed.length > 50) {
    throw new AssetInvariantError(
      "Asset code must not exceed 50 characters",
      "assetCode",
    );
  }

  return trimmed as AssetCode;
}
