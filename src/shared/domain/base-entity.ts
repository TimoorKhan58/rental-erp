export interface BaseEntity<TId = string> {
  id: TId;
  createdAt: Date;
  updatedAt: Date;
}

export type Entity<TId = string> = BaseEntity<TId>;
