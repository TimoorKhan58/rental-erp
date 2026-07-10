import type { IdentityUserDto } from "../dtos/identity-user.dto";
import {
  toCreateIdentityUserData,
  toIdentityUserDto,
} from "../mappers/identity-user.mapper";
import {
  CreateIdentityUserSchema,
  type CreateIdentityUserInput,
} from "../schemas/identity-user.schemas";
import { toIdentityUserAuditValues } from "./identity-audit.mapper";
import {
  IDENTITY_MODULE,
  IDENTITY_USER_ENTITY_NAME,
} from "./identity-service.constants";
import type { IIdentityTransactionRunner } from "./identity-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import { IdentityUserInvariantError } from "@/modules/identity/domain/identity-user.errors";

export class CreateIdentityUserService {
  constructor(
    private readonly transactionRunner: IIdentityTransactionRunner,
  ) {}

  async execute(input: CreateIdentityUserInput): Promise<IdentityUserDto> {
    const data = parseRequest(CreateIdentityUserSchema, input);

    return this.transactionRunner.run(async (scope) => {
      const role = await scope.roleRepository.findByName(data.role);

      if (role === null) {
        throw new NotFoundError({
          message: "Role not found",
          details: { role: data.role },
        });
      }

      const existingEmail = await scope.userRepository.findByEmail(data.email);

      if (existingEmail !== null) {
        throw new ConflictError({
          message: "Email already exists",
          details: { email: data.email },
        });
      }

      const createData = toCreateIdentityUserData(data, role);

      let user;

      try {
        user = await scope.userRepository.create(createData);
      } catch (error) {
        if (error instanceof IdentityUserInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: error.field ? { field: error.field } : undefined,
          });
        }

        throw error;
      }

      try {
        const authResult = await scope.authGateway.createCredentialUser({
          email: user.email,
          name: user.name,
          password: data.password,
          role: user.roleName,
          erpUserId: user.id,
        });

        user = await scope.userRepository.linkAuthUser({
          userId: user.id,
          authUserId: authResult.authUserId,
        });
      } catch (error) {
        throw new UnprocessableError({
          message: "Failed to provision authentication credentials",
          details: {
            email: data.email,
            cause: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }

      await scope.auditLogger.log({
        module: IDENTITY_MODULE,
        entityName: IDENTITY_USER_ENTITY_NAME,
        recordId: user.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toIdentityUserAuditValues(user),
      });

      return toIdentityUserDto(user);
    });
  }
}
