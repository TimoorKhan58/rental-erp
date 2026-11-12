import { describe, expect, it } from "vitest";

import { getOrganizationScope, runAsSystem, runInOrganization } from "./organization-scope";

/** Mimics a Prisma query: does nothing until someone awaits it. */
function lazyQuery() {
  return {
    then<R>(resolve: (value: ReturnType<typeof getOrganizationScope>) => R) {
      return Promise.resolve(getOrganizationScope()).then(resolve);
    },
  };
}

describe("organization scope helpers", () => {
  it("runs lazy (Prisma-style) queries inside the organization", async () => {
    const seen = await runInOrganization("org-a", () => lazyQuery());

    expect(seen).toEqual({ kind: "organization", organizationId: "org-a" });
  });

  it("runs lazy queries inside the system scope", async () => {
    const seen = await runAsSystem("test", () => lazyQuery());

    expect(seen).toMatchObject({ kind: "system" });
  });

  it("does not leak the scope after the operation", async () => {
    await runInOrganization("org-a", async () => undefined);

    expect(getOrganizationScope()).toBeUndefined();
  });
});

describe("one scope store per process", () => {
  it("is shared through globalThis so separately bundled modules see the same scope", async () => {
    const store = (globalThis as { rentcoreOrganizationScope?: { getStore(): unknown } })
      .rentcoreOrganizationScope;

    const seen = await runInOrganization("org-a", async () => store?.getStore());

    expect(seen).toEqual({ kind: "organization", organizationId: "org-a" });
  });
});
