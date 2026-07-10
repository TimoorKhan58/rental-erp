import type { NextRequest } from "next/server";

import type { AssetServiceResolver } from "@/modules/asset/application/services/asset-application-services.interface";
import type { AssetDto } from "@/modules/asset/application/dtos/asset.dto";
import {
  AddMaintenanceHistorySchema,
  AssetIdParamSchema,
  CreateAssetSchema,
  DisposeAssetSchema,
  TransferAssetSchema,
  UpdateAssetSchema,
} from "@/modules/asset/application";
import { ListAssetsSchema } from "@/modules/asset/application/schemas/list-assets.schema";
import { parseRequest } from "@/shared/application/validation";
import { PERMISSIONS } from "@/shared/application/authorization";
import type { PaginatedResult } from "@/shared/domain/pagination";

import {
  toAssetListResponse,
  toAssetResponse,
} from "../mappers/asset-response.mapper";
import {
  runAssetApiRoute,
  toJsonResponse,
} from "../http/asset-api.route-runner";
import { ASSET_ROUTES } from "../routes/asset.routes";

export async function handleListAssets(
  request: NextRequest,
  resolveServices: AssetServiceResolver,
): Promise<Response> {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const listInput = parseRequest(ListAssetsSchema, query);

  const result = await runAssetApiRoute({
    request,
    route: ASSET_ROUTES.base,
    httpMethod: "GET",
    permission: PERMISSIONS.assets.read,
    resolveServices,
    handler: async (_ctx, services) => services.listAssets.execute(listInput),
  });

  if (result.status === 200 && "data" in result.body) {
    const paginated = result.body.data as PaginatedResult<AssetDto>;
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAssetListResponse(paginated),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleCreateAsset(
  request: NextRequest,
  resolveServices: AssetServiceResolver,
): Promise<Response> {
  const body: unknown = await request.json();
  const createInput = parseRequest(CreateAssetSchema, body);

  const result = await runAssetApiRoute({
    request,
    route: ASSET_ROUTES.base,
    httpMethod: "POST",
    permission: PERMISSIONS.assets.create,
    resolveServices,
    handler: async (_ctx, services) => services.createAsset.execute(createInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAssetResponse(result.body.data as AssetDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleGetAssetById(
  request: NextRequest,
  id: string,
  resolveServices: AssetServiceResolver,
): Promise<Response> {
  const params = parseRequest(AssetIdParamSchema, { id });

  const result = await runAssetApiRoute({
    request,
    route: ASSET_ROUTES.byId(id),
    httpMethod: "GET",
    permission: PERMISSIONS.assets.read,
    resolveServices,
    handler: async (_ctx, services) => services.getAssetById.execute(params),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAssetResponse(result.body.data as AssetDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleUpdateAsset(
  request: NextRequest,
  id: string,
  resolveServices: AssetServiceResolver,
): Promise<Response> {
  const params = parseRequest(AssetIdParamSchema, { id });
  const body: unknown = await request.json();
  const updateInput = parseRequest(UpdateAssetSchema, body);

  const result = await runAssetApiRoute({
    request,
    route: ASSET_ROUTES.byId(id),
    httpMethod: "PATCH",
    permission: PERMISSIONS.assets.update,
    resolveServices,
    handler: async (_ctx, services) =>
      services.updateAsset.execute(params, updateInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAssetResponse(result.body.data as AssetDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleTransferAsset(
  request: NextRequest,
  id: string,
  resolveServices: AssetServiceResolver,
): Promise<Response> {
  const params = parseRequest(AssetIdParamSchema, { id });
  const body: unknown = await request.json();
  const transferInput = parseRequest(TransferAssetSchema, body);

  const result = await runAssetApiRoute({
    request,
    route: ASSET_ROUTES.transfer(id),
    httpMethod: "POST",
    permission: PERMISSIONS.assets.transfer,
    resolveServices,
    handler: async (_ctx, services) =>
      services.transferAsset.execute(params, transferInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAssetResponse(result.body.data as AssetDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleDisposeAsset(
  request: NextRequest,
  id: string,
  resolveServices: AssetServiceResolver,
): Promise<Response> {
  const params = parseRequest(AssetIdParamSchema, { id });
  const body: unknown = await request.json();
  const disposeInput = parseRequest(DisposeAssetSchema, body);

  const result = await runAssetApiRoute({
    request,
    route: ASSET_ROUTES.dispose(id),
    httpMethod: "POST",
    permission: PERMISSIONS.assets.dispose,
    resolveServices,
    handler: async (_ctx, services) =>
      services.disposeAsset.execute(params, disposeInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAssetResponse(result.body.data as AssetDto),
      },
    });
  }

  return toJsonResponse(result);
}

export async function handleAddMaintenanceHistory(
  request: NextRequest,
  id: string,
  resolveServices: AssetServiceResolver,
): Promise<Response> {
  const params = parseRequest(AssetIdParamSchema, { id });
  const body: unknown = await request.json();
  const maintenanceInput = parseRequest(AddMaintenanceHistorySchema, body);

  const result = await runAssetApiRoute({
    request,
    route: ASSET_ROUTES.maintenance(id),
    httpMethod: "POST",
    permission: PERMISSIONS.assets.maintenance,
    resolveServices,
    handler: async (_ctx, services) =>
      services.addMaintenanceHistory.execute(params, maintenanceInput),
  });

  if (result.status === 200 && "data" in result.body) {
    return toJsonResponse({
      ...result,
      body: {
        ...result.body,
        data: toAssetResponse(result.body.data as AssetDto),
      },
    });
  }

  return toJsonResponse(result);
}
