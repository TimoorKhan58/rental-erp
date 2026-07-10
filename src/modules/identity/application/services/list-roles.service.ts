import type { IRoleRepository } from "@/modules/identity/domain/identity-user.repository.interface";
import type { RoleDto } from "../dtos/identity-user.dto";
import { toRoleDto } from "../mappers/identity-user.mapper";

export class ListRolesService {
  constructor(private readonly repository: IRoleRepository) {}

  async execute(): Promise<RoleDto[]> {
    const roles = await this.repository.findAll();
    return roles.map(toRoleDto);
  }
}
