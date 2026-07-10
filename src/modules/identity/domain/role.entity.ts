import type { RoleId } from "@/shared/domain/ids";

import type { UserRole } from "@/constants/roles";

export interface RoleProps {
  id: RoleId;
  name: UserRole;
}

export class Role {
  readonly id: RoleId;
  readonly name: UserRole;

  private constructor(props: RoleProps) {
    this.id = props.id;
    this.name = props.name;
  }

  static reconstitute(props: RoleProps): Role {
    return new Role(props);
  }

  toProps(): RoleProps {
    return {
      id: this.id,
      name: this.name,
    };
  }
}
