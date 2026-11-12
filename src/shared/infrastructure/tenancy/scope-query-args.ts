import {
  CrossOrganizationWriteError,
  OrganizationScopeMissingError,
  type OrganizationScope,
} from "./organization-scope";
import { MODEL_RELATIONS, TENANT_MODELS } from "./tenant-model-map";

type Data = Record<string, unknown>;

/** Single-row operations: the organization joins the unique `where`. */
const UNIQUE_WHERE_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "delete",
  "upsert",
]);

/** Filtering operations: the organization is AND-ed onto `where`. */
const FILTER_WHERE_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "updateManyAndReturn",
  "deleteMany",
]);

const CREATE_OPERATIONS = new Set(["create", "createMany", "createManyAndReturn"]);

function isObject(value: unknown): value is Data {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asList<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

function assertSameOrganization(model: string, data: Data, organizationId: string): void {
  if (data.organizationId !== undefined && data.organizationId !== organizationId) {
    throw new CrossOrganizationWriteError(model);
  }

  const relation = data.organization;
  if (isObject(relation)) {
    const connect = relation.connect;
    if (!isObject(connect) || connect.id !== organizationId) {
      throw new CrossOrganizationWriteError(model);
    }
  }
}

/** Applies nested creates/updates found under relation fields of `data`. */
function scopeNestedWrites(model: string, data: Data, organizationId: string): Data {
  const relations = MODEL_RELATIONS[model] ?? {};
  const result: Data = { ...data };

  for (const [field, target] of Object.entries(relations)) {
    const nested = result[field];
    if (!isObject(nested)) continue;

    const next: Data = { ...nested };

    if (next.create !== undefined) {
      next.create = Array.isArray(next.create)
        ? next.create.map((item) => scopeCreateData(target, item as Data, organizationId))
        : scopeCreateData(target, next.create as Data, organizationId);
    }

    if (isObject(next.createMany) && next.createMany.data !== undefined) {
      const createMany = { ...next.createMany };
      createMany.data = Array.isArray(createMany.data)
        ? createMany.data.map((item) => scopeScalarCreate(target, item as Data, organizationId))
        : scopeScalarCreate(target, createMany.data as Data, organizationId);
      next.createMany = createMany;
    }

    if (next.connectOrCreate !== undefined) {
      next.connectOrCreate = asList(next.connectOrCreate as Data | Data[]).map((item) => ({
        ...item,
        create: scopeCreateData(target, item.create as Data, organizationId),
      }));
    }

    if (next.upsert !== undefined) {
      next.upsert = asList(next.upsert as Data | Data[]).map((item) => ({
        ...item,
        create: scopeCreateData(target, item.create as Data, organizationId),
        update: scopeUpdateData(target, item.update as Data, organizationId),
      }));
    }

    if (next.update !== undefined) {
      next.update = Array.isArray(next.update)
        ? next.update.map((item: Data) =>
            isObject(item.data)
              ? { ...item, data: scopeUpdateData(target, item.data, organizationId) }
              : item,
          )
        : isObject((next.update as Data).data)
          ? {
              ...(next.update as Data),
              data: scopeUpdateData(target, (next.update as Data).data as Data, organizationId),
            }
          : scopeUpdateData(target, next.update as Data, organizationId);
    }

    result[field] = next;
  }

  return result;
}

/** createMany-style rows only accept scalar columns. */
function scopeScalarCreate(model: string, data: Data, organizationId: string): Data {
  if (!TENANT_MODELS.has(model)) return data;
  assertSameOrganization(model, data, organizationId);
  return { ...data, organizationId };
}

/** Stamps the organization on a create, using the shape Prisma expects. */
export function scopeCreateData(model: string, data: Data, organizationId: string): Data {
  if (!isObject(data)) return data;

  let result = scopeNestedWrites(model, data, organizationId);
  if (!TENANT_MODELS.has(model)) return result;

  assertSameOrganization(model, result, organizationId);

  // Prisma "checked" inputs (relations given as objects) cannot also take
  // the raw organizationId column, so connect the relation instead.
  const relations = MODEL_RELATIONS[model] ?? {};
  const usesRelationObjects = Object.keys(result).some(
    (key) => key !== "organization" && key in relations && isObject(result[key]),
  );

  if (usesRelationObjects) {
    const { organizationId: _ignored, ...rest } = result;
    void _ignored;
    result = { ...rest, organization: { connect: { id: organizationId } } };
  } else if (result.organization === undefined) {
    result = { ...result, organizationId };
  }

  return result;
}

export function scopeUpdateData(model: string, data: Data, organizationId: string): Data {
  if (!isObject(data)) return data;
  if (TENANT_MODELS.has(model)) assertSameOrganization(model, data, organizationId);
  return scopeNestedWrites(model, data, organizationId);
}

/**
 * Returns `args` limited to the current organization for per-business
 * models. System scope and platform models pass through unchanged.
 */
export function scopeQueryArgs(
  model: string | undefined,
  operation: string,
  args: unknown,
  scope: OrganizationScope | undefined,
): unknown {
  if (model === undefined) return args;

  const isTenantModel = TENANT_MODELS.has(model);

  if (scope?.kind === "system") return args;

  if (scope === undefined) {
    if (isTenantModel) throw new OrganizationScopeMissingError(model, operation);
    return args;
  }

  const { organizationId } = scope;
  const input: Data = isObject(args) ? { ...args } : {};

  if (isTenantModel && UNIQUE_WHERE_OPERATIONS.has(operation)) {
    input.where = { ...(isObject(input.where) ? input.where : {}), organizationId };
  }

  if (isTenantModel && FILTER_WHERE_OPERATIONS.has(operation)) {
    input.where = isObject(input.where)
      ? { AND: [input.where, { organizationId }] }
      : { organizationId };
  }

  if (CREATE_OPERATIONS.has(operation) && input.data !== undefined) {
    input.data =
      operation === "create"
        ? scopeCreateData(model, input.data as Data, organizationId)
        : asList(input.data as Data | Data[]).map((row) =>
            scopeScalarCreate(model, row, organizationId),
          );
  }

  if (operation === "upsert") {
    input.create = scopeCreateData(model, input.create as Data, organizationId);
    input.update = scopeUpdateData(model, input.update as Data, organizationId);
  }

  if (
    (operation === "update" || operation === "updateMany" || operation === "updateManyAndReturn") &&
    isObject(input.data)
  ) {
    input.data = scopeUpdateData(model, input.data, organizationId);
  }

  return input;
}
