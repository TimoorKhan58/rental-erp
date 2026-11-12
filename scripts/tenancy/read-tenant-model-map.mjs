// Reads prisma/schema.prisma and returns which models are per-business
// (have an organizationId) and, for every model, its relation fields.
// Used to generate src/shared/infrastructure/tenancy/tenant-model-map.ts
// and by a test that fails if that file drifts from the schema.
import { readFileSync } from "node:fs";

export function readTenantModelMap(schemaPath) {
  const schema = readFileSync(schemaPath, "utf8").replace(/\r\n/g, "\n");
  const blocks = [...schema.matchAll(/^model (\w+) \{\n([\s\S]*?)^\}/gm)];
  const modelNames = new Set(blocks.map((match) => match[1]));

  const tenantModels = [];
  const relations = {};

  for (const [, model, body] of blocks) {
    const fields = {};
    let isTenant = false;

    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (line === "" || line.startsWith("//") || line.startsWith("@@")) continue;

      const [name, type] = line.split(/\s+/);
      if (!name || !type) continue;
      if (name === "organizationId") isTenant = true;

      const baseType = type.replace(/[?[\]]/g, "");
      if (modelNames.has(baseType)) {
        fields[name] = baseType;
      }
    }

    if (isTenant) tenantModels.push(model);
    relations[model] = fields;
  }

  return { tenantModels: tenantModels.sort(), relations };
}
