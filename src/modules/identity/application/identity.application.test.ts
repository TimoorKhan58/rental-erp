import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError } from "@/shared/infrastructure/errors";
import { USER_ROLES } from "@/constants/roles";
import { PERMISSIONS } from "@/shared/application/authorization";

import {
  OTHER_USER_ID,
  SECOND_OWNER_USER_ID,
  USER_ID,
  VALID_CREATE_INPUT,
  WORKER_USER_ID,
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
import { sendIdentityUserInvitation } from "@/modules/identity/application/services/send-identity-user-invitation";

vi.mock("@/shared/infrastructure/logging", () => ({
  createAppLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  }),
}));

vi.mock(
  "@/modules/identity/application/services/send-identity-user-invitation",
  () => ({
    sendIdentityUserInvitation: vi.fn().mockResolvedValue(undefined),
  }),
);

vi.mock(
  "@/modules/identity/application/services/generate-provisioning-password",
  () => ({
    generateProvisioningPassword: () => "generated-provisioning-password-32ch",
  }),
);

function createWriteScope(
  actorUserId: string = USER_ID,
  actorRole: (typeof USER_ROLES)[keyof typeof USER_ROLES] = USER_ROLES.OWNER,
) {
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
    actorRole,
    transactionRunner: createPassThroughIdentityTransactionRunner({
      userRepository,
      roleRepository,
      authGateway,
      auditLogger,
      actorUserId,
      actorRole,
    }),
  };
}

describe("CreateIdentityUserService", () => {
  beforeEach(() => {
    vi.mocked(sendIdentityUserInvitation).mockClear();
    vi.mocked(sendIdentityUserInvitation).mockResolvedValue(undefined);
  });

  it("creates ERP and auth users with audit logging", async () => {
    const scope = createWriteScope();
    const service = new CreateIdentityUserService(scope.transactionRunner);

    const result = await service.execute(VALID_CREATE_INPUT);

    expect(result.email).toBe("jane.admin@example.com");
    expect(result.invitationDelivered).toBe(true);
    expect(scope.userRepository.count()).toBe(1);
    expect(scope.authGateway.createdUsers).toHaveLength(1);
    expect(scope.authGateway.createdUsers[0]?.password).toBe(
      "generated-provisioning-password-32ch",
    );
    expect(scope.auditLogger.entries[0]).toMatchObject({
      module: IDENTITY_MODULE,
      entityName: IDENTITY_USER_ENTITY_NAME,
      action: "CREATE",
    });
    expect(sendIdentityUserInvitation).toHaveBeenCalledWith(
      "jane.admin@example.com",
    );
  });

  it("skips invitation when sendInvitation is false", async () => {
    const scope = createWriteScope();
    const service = new CreateIdentityUserService(scope.transactionRunner);

    const result = await service.execute({
      ...VALID_CREATE_INPUT,
      sendInvitation: false,
    });

    expect(result.invitationDelivered).toBe(true);
    expect(sendIdentityUserInvitation).not.toHaveBeenCalled();
  });

  it("keeps the user and returns invitationDelivered false when invite fails", async () => {
    vi.mocked(sendIdentityUserInvitation).mockRejectedValueOnce(
      new Error("smtp://secret-host failed"),
    );
    const scope = createWriteScope();
    const service = new CreateIdentityUserService(scope.transactionRunner);

    const result = await service.execute(VALID_CREATE_INPUT);

    expect(result.invitationDelivered).toBe(false);
    expect(result.id).toBeTruthy();
    expect(scope.userRepository.count()).toBe(1);
    expect(result).not.toHaveProperty("cause");
    expect(JSON.stringify(result)).not.toContain("smtp://");
    expect(JSON.stringify(result)).not.toContain("secret-host");
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
    expect(sendIdentityUserInvitation).not.toHaveBeenCalled();
  });
});

describe("UpdateIdentityUserService", () => {
  it("updates profile and role assignment", async () => {
    const scope = createWriteScope();
    scope.userRepository.seed([
      buildIdentityUserEntity(),
      buildIdentityUserEntity({
        id: OTHER_USER_ID,
        email: "second.owner@example.com",
        roleName: USER_ROLES.OWNER,
        authUserId: "auth-owner-2",
      }),
    ]);
    const service = new UpdateIdentityUserService(scope.transactionRunner);

    const result = await service.execute(
      { id: USER_ID },
      { role: USER_ROLES.MANAGER, name: "Updated Owner" },
    );

    expect(result.role).toBe(USER_ROLES.MANAGER);
    expect(result.name).toBe("Updated Owner");
  });

  it("blocks managers from assigning the owner role", async () => {
    const scope = createWriteScope(USER_ID, USER_ROLES.MANAGER);
    scope.userRepository.seed([
      buildIdentityUserEntity({
        roleName: USER_ROLES.MANAGER,
        email: "manager.actor@example.com",
      }),
    ]);
    const service = new UpdateIdentityUserService(scope.transactionRunner);

    await expect(
      service.execute({ id: USER_ID }, { role: USER_ROLES.OWNER }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("blocks demoting the last active owner", async () => {
    const scope = createWriteScope();
    scope.userRepository.seed([buildIdentityUserEntity()]);
    const service = new UpdateIdentityUserService(scope.transactionRunner);

    await expect(
      service.execute({ id: USER_ID }, { role: USER_ROLES.MANAGER }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("prevents self deactivation", async () => {
    const scope = createWriteScope(USER_ID);
    scope.userRepository.seed([buildIdentityUserEntity()]);
    const service = new UpdateIdentityUserService(scope.transactionRunner);

    await expect(
      service.execute({ id: USER_ID }, { isActive: false }),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects manager deactivating an owner via update", async () => {
    const scope = createWriteScope(OTHER_USER_ID, USER_ROLES.MANAGER);
    scope.userRepository.seed([
      buildIdentityUserEntity(),
      buildIdentityUserEntity({
        id: OTHER_USER_ID,
        email: "manager@example.com",
        roleName: USER_ROLES.MANAGER,
        authUserId: "auth-manager",
      }),
      buildIdentityUserEntity({
        id: SECOND_OWNER_USER_ID,
        email: "owner2@example.com",
        roleName: USER_ROLES.OWNER,
        authUserId: "auth-owner-2",
      }),
    ]);
    const service = new UpdateIdentityUserService(scope.transactionRunner);

    await expect(
      service.execute({ id: USER_ID }, { isActive: false }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("CreateIdentityUserService role hierarchy", () => {
  it("blocks managers from creating owners", async () => {
    const scope = createWriteScope(USER_ID, USER_ROLES.MANAGER);
    const service = new CreateIdentityUserService(scope.transactionRunner);

    await expect(
      service.execute({
        ...VALID_CREATE_INPUT,
        role: USER_ROLES.OWNER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
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

  it("allows owner to deactivate a manager", async () => {
    const scope = createWriteScope(USER_ID, USER_ROLES.OWNER);
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
  });

  it("allows manager to deactivate a non-owner user", async () => {
    const scope = createWriteScope(OTHER_USER_ID, USER_ROLES.MANAGER);
    scope.userRepository.seed([
      buildIdentityUserEntity(),
      buildIdentityUserEntity({
        id: OTHER_USER_ID,
        email: "manager@example.com",
        roleName: USER_ROLES.MANAGER,
        authUserId: "auth-manager",
      }),
      buildIdentityUserEntity({
        id: WORKER_USER_ID,
        email: "worker@example.com",
        roleName: USER_ROLES.WORKER,
        authUserId: "auth-worker",
      }),
    ]);
    const service = new DeactivateIdentityUserService(scope.transactionRunner);

    await service.execute({ id: WORKER_USER_ID });

    const updated = await scope.userRepository.findById(WORKER_USER_ID);
    expect(updated?.isActive).toBe(false);
  });

  it("rejects manager deactivating an owner", async () => {
    const scope = createWriteScope(OTHER_USER_ID, USER_ROLES.MANAGER);
    scope.userRepository.seed([
      buildIdentityUserEntity(),
      buildIdentityUserEntity({
        id: OTHER_USER_ID,
        email: "manager@example.com",
        roleName: USER_ROLES.MANAGER,
        authUserId: "auth-manager",
      }),
      buildIdentityUserEntity({
        id: SECOND_OWNER_USER_ID,
        email: "owner2@example.com",
        roleName: USER_ROLES.OWNER,
        authUserId: "auth-owner-2",
      }),
    ]);
    const service = new DeactivateIdentityUserService(scope.transactionRunner);

    await expect(service.execute({ id: USER_ID })).rejects.toBeInstanceOf(
      ForbiddenError,
    );

    const owner = await scope.userRepository.findById(USER_ID);
    expect(owner?.isActive).toBe(true);
  });
});

describe("ResetIdentityUserPasswordService", () => {
  it("allows owner to reset a manager password", async () => {
    const scope = createWriteScope(USER_ID, USER_ROLES.OWNER);
    scope.userRepository.seed([
      buildIdentityUserEntity(),
      buildIdentityUserEntity({
        id: OTHER_USER_ID,
        email: "manager@example.com",
        roleName: USER_ROLES.MANAGER,
        authUserId: "auth-manager",
      }),
    ]);
    const service = new ResetIdentityUserPasswordService(scope.transactionRunner);

    await service.execute({ id: OTHER_USER_ID }, { password: "newpassword123" });

    expect(scope.authGateway.passwordResets[0]).toMatchObject({
      authUserId: "auth-manager",
    });
  });

  it("allows owner to reset a worker password", async () => {
    const scope = createWriteScope(USER_ID, USER_ROLES.OWNER);
    scope.userRepository.seed([
      buildIdentityUserEntity(),
      buildIdentityUserEntity({
        id: OTHER_USER_ID,
        email: "worker@example.com",
        roleName: USER_ROLES.WORKER,
        authUserId: "auth-worker",
      }),
    ]);
    const service = new ResetIdentityUserPasswordService(scope.transactionRunner);

    await service.execute({ id: OTHER_USER_ID }, { password: "newpassword123" });

    expect(scope.authGateway.passwordResets[0]).toMatchObject({
      authUserId: "auth-worker",
    });
  });

  it("allows manager to reset a non-owner password", async () => {
    const scope = createWriteScope(OTHER_USER_ID, USER_ROLES.MANAGER);
    scope.userRepository.seed([
      buildIdentityUserEntity(),
      buildIdentityUserEntity({
        id: OTHER_USER_ID,
        email: "manager@example.com",
        roleName: USER_ROLES.MANAGER,
        authUserId: "auth-manager",
      }),
      buildIdentityUserEntity({
        id: WORKER_USER_ID,
        email: "worker@example.com",
        roleName: USER_ROLES.WORKER,
        authUserId: "auth-worker",
      }),
    ]);
    const service = new ResetIdentityUserPasswordService(scope.transactionRunner);

    await service.execute({ id: WORKER_USER_ID }, { password: "newpassword123" });

    expect(scope.authGateway.passwordResets[0]).toMatchObject({
      authUserId: "auth-worker",
    });
  });

  it("rejects manager resetting an owner password", async () => {
    const scope = createWriteScope(OTHER_USER_ID, USER_ROLES.MANAGER);
    scope.userRepository.seed([
      buildIdentityUserEntity(),
      buildIdentityUserEntity({
        id: OTHER_USER_ID,
        email: "manager@example.com",
        roleName: USER_ROLES.MANAGER,
        authUserId: "auth-manager",
      }),
    ]);
    const service = new ResetIdentityUserPasswordService(scope.transactionRunner);

    await expect(
      service.execute({ id: USER_ID }, { password: "newpassword123" }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(scope.authGateway.passwordResets).toHaveLength(0);
  });

  it("resets linked auth credentials", async () => {
    const scope = createWriteScope();
    scope.userRepository.seed([
      buildIdentityUserEntity({
        id: OTHER_USER_ID,
        email: "manager@example.com",
        roleName: USER_ROLES.MANAGER,
        authUserId: "auth-manager",
      }),
    ]);
    const service = new ResetIdentityUserPasswordService(scope.transactionRunner);

    await service.execute({ id: OTHER_USER_ID }, { password: "newpassword123" });

    expect(scope.authGateway.passwordResets[0]).toMatchObject({
      authUserId: "auth-manager",
    });
  });

  it("rejects users without auth linkage", async () => {
    const scope = createWriteScope();
    scope.userRepository.seed([
      buildIdentityUserEntity({
        id: OTHER_USER_ID,
        email: "manager@example.com",
        roleName: USER_ROLES.MANAGER,
        authUserId: null,
      }),
    ]);
    const service = new ResetIdentityUserPasswordService(scope.transactionRunner);

    await expect(
      service.execute({ id: OTHER_USER_ID }, { password: "newpassword123" }),
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
      USER_ID,
      USER_ROLES.OWNER,
    );
    const service = new CreateIdentityUserService(transactionRunner);

    await expect(service.execute(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      UnprocessableError,
    );
    expect(userRepository.count()).toBe(0);
    expect(auditLogger.entries).toHaveLength(0);
  });
});
