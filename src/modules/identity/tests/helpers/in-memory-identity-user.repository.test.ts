import { describe, expect, it } from "vitest";

import {
  InMemoryIdentityUserRepository,
  seedDefaultIdentityUsers,
} from "./in-memory-identity-user.repository";
import { USER_ROLES } from "@/constants/roles";
import { buildIdentityUserEntity } from "./identity-user.fixtures";
import { OTHER_USER_ID } from "./identity-user.fixtures";

describe("InMemoryIdentityUserRepository", () => {
  it("filters by role and active status", async () => {
    const repository = new InMemoryIdentityUserRepository();
    repository.seed([
      buildIdentityUserEntity(),
      buildIdentityUserEntity({
        id: OTHER_USER_ID,
        email: "manager@example.com",
        roleName: USER_ROLES.MANAGER,
        isActive: false,
      }),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
      role: USER_ROLES.MANAGER,
      isActive: false,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.email).toBe("manager@example.com");
  });

  it("supports snapshot and restore", () => {
    const repository = new InMemoryIdentityUserRepository();
    seedDefaultIdentityUsers(repository);
    const snapshot = repository.snapshot();
    repository.seed([]);

    expect(repository.count()).toBe(0);
    repository.restore(snapshot);
    expect(repository.count()).toBe(1);
  });
});
