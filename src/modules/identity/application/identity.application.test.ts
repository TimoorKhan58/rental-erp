import { describe, expect, it } from "vitest";

import { CreateIdentityUserService } from "@/modules/identity/application/services/create-identity-user.service";
import { DeactivateIdentityUserService } from "@/modules/identity/application/services/deactivate-identity-user.service";
import { GetIdentityUserPermissionsService } from "@/modules/identity/application/services/get-identity-user-permissions.service";
import { ListIdentityUsersService } from "@/modules/identity/application/services/list-identity-users.service";
import { ResetIdentityUserPasswordService } from "@/modules/identity/application/services/reset-identity-user-password.service";
import { UpdateIdentityUserService } from "@/modules/identity/application/services/update-identity-user.service";
import {
  IDENTITY_MODULE,
  IDENTITY_USER_ENTITY_NAME,
} from "@/modules/identity/application/services/identity-service.constants";
import { ConflictError, NotFoundError, UnprocessableError } from "@/shared/infrastructure/errors";
import { USER_ROLES } from "@/constants/roles";
import { PERMISSIONS } from "@/shared/application/authorization";

import {
  OTHER_USER_ID,
  USER_ID,
  VALID_CREATE_INPUT,
  buildIdentityUserEntity,
} from "../tests/helpers/identity-user.fixtures";
import {
  InMemoryIdentityUserRepository,
  InMemoryRoleRepository,
} from "../tests/helpers/in-memory-identity-user.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  MockIdentityAuthGateway,
  createPassThroughIdentityTransactionRunner,
  createRollbackIdentityTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

function createWriteScope(actorUserId: string = USER_ID) {
  const userRepository = new InMemoryIdentityUserRepository();
  const roleRepository = new InMemoryRoleRepository();
  const authGateway = new MockIdentityAuthGateway();
  const auditLogger = new MockAuditLogger();

  return {
    userRepository,
    roleRepository,
    authGateway,
    auditLogger,
    actorUserId,
    transactionRunner: createPassThroughIdentityTransactionRunner({
      userRepository,
      roleRepository,
      authGateway,
      auditLogger,
      actorUserId,
    }),
  };
}

describe("CreateIdentityUserService", () => {
  it("creates ERP and auth users with audit logging", async () => {
    const scope = createWriteScope();
    const service = new CreateIdentityUserService(scope.transactionRunner);

    const result = await service.execute(VALID_CREATE_INPUT);

    expect(result.email).toBe("jane.admin@example.com");
    expect(scope.userRepository.count()).toBe(1);
    expect(scope.authGateway.createdUsers).toHaveLength(1);
    expect(scope.auditLogger.entries[0]).toMatchObject({
      module: IDENTITY_MODULE,
      entityName: IDENTITY_USER_ENTITY_NAME,
      action: "CREATE",
    });
  });

  it("rejects duplicate email", async () => {
    const scope = createWriteScope();
    scope.userRepository.seed([
      buildIdentityUserEntity({ email: VALID_CREATE_INPUT.email }),
    ]);
    const service = new CreateIdentityUserService(scope.transactionRunner);

    await expect(service.execute(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});

describe("UpdateIdentityUserService", () => {
  it("updates profile and role assignment", async () => {
    const scope = createWriteScope();
    scope.userRepository.seed([buildIdentityUserEntity()]);
    const service = new UpdateIdentityUserService(scope.transactionRunner);

    const result = await service.execute(
      { id: USER_ID },
      { role: USER_ROLES.MANAGER, name: "Updated Owner" },
    );

    expect(result.role).toBe(USER_ROLES.MANAGER);
    expect(result.name).toBe("Updated Owner");
  });

  it("prevents self deactivation", async () => {
    const scope = createWriteScope(USER_ID);
    scope.userRepository.seed([buildIdentityUserEntity()]);
    const service = new UpdateIdentityUserService(scope.transactionRunner);

    await expect(
      service.execute({ id: USER_ID }, { isActive: false }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("DeactivateIdentityUserService", () => {
  it("deactivates another user and revokes sessions", async () => {
    const scope = createWriteScope("actor-user");
    scope.userRepository.seed([
      buildIdentityUserEntity(),
      buildIdentityUserEntity({
        id: OTHER_USER_ID,
        email: "manager@example.com",
        roleName: USER_ROLES.MANAGER,
        authUserId: "auth-manager",
      }),
    ]);
    const service = new DeactivateIdentityUserService(scope.transactionRunner);

    await service.execute({ id: OTHER_USER_ID });

    const updated = await scope.userRepository.findById(OTHER_USER_ID);
    expect(updated?.isActive).toBe(false);
    expect(scope.authGateway.revokedSessions).toContain("auth-manager");
  });
});

describe("ResetIdentityUserPasswordService", () => {
  it("resets linked auth credentials", async () => {
    const scope = createWriteScope();
    scope.userRepository.seed([buildIdentityUserEntity()]);
    const service = new ResetIdentityUserPasswordService(scope.transactionRunner);

    await service.execute({ id: USER_ID }, { password: "newpassword123" });

    expect(scope.authGateway.passwordResets[0]).toMatchObject({
      authUserId: "auth-owner-1",
    });
  });

  it("rejects users without auth linkage", async () => {
    const scope = createWriteScope();
    scope.userRepository.seed([
      buildIdentityUserEntity({ authUserId: null }),
    ]);
    const service = new ResetIdentityUserPasswordService(scope.transactionRunner);

    await expect(
      service.execute({ id: USER_ID }, { password: "newpassword123" }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("ListIdentityUsersService", () => {
  it("returns paginated users", async () => {
    const repository = new InMemoryIdentityUserRepository();
    repository.seed([
      buildIdentityUserEntity(),
      buildIdentityUserEntity({
        id: OTHER_USER_ID,
        email: "manager@example.com",
        roleName: USER_ROLES.MANAGER,
      }),
    ]);
    const service = new ListIdentityUsersService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 20,
      sortOrder: "asc",
    });

    expect(result.items).toHaveLength(2);
    expect(result.meta.total).toBe(2);
  });
});

describe("GetIdentityUserPermissionsService", () => {
  it("returns effective permissions for role", async () => {
    const repository = new InMemoryIdentityUserRepository();
    repository.seed([buildIdentityUserEntity()]);
    const service = new GetIdentityUserPermissionsService(repository);

    const result = await service.execute({ id: USER_ID });

    expect(result.permissions).toContain(PERMISSIONS.identity.create);
    expect(result.role).toBe(USER_ROLES.OWNER);
  });

  it("throws when user is missing", async () => {
    const repository = new InMemoryIdentityUserRepository();
    const service = new GetIdentityUserPermissionsService(repository);

    await expect(service.execute({ id: USER_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("identity transaction rollback", () => {
  it("restores repository state when auth provisioning fails", async () => {
    const userRepository = new InMemoryIdentityUserRepository();
    const roleRepository = new InMemoryRoleRepository();
    const authGateway = new MockIdentityAuthGateway();
    const auditLogger = new MockAuditLogger();

    authGateway.createCredentialUser = async () => {
      throw new Error("auth failure");
    };

    const transactionRunner = createRollbackIdentityTransactionRunner(
      userRepository,
      roleRepository,
      authGateway,
      auditLogger,
    );
    const service = new CreateIdentityUserService(transactionRunner);

    await expect(service.execute(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      UnprocessableError,
    );
    expect(userRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});
