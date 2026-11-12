export enum Role {
  ADMIN = "admin",
  USER = "user",
  ADMIN_SUB_USER = "admin_sub_user",
  PRODUCER = "producer",
}

export interface JwtPayload {
  _id?: string;
  sub?: string;
  role: Role;
  email?: string;
  firstName?: string;
  lastName?: string;
  iat?: number;
  exp?: number;
}
