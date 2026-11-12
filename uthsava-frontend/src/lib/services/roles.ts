import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

export interface RolePermission {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  all?: boolean;
}

export interface Role {
  _id: string;
  name: string;
  description?: string;
  status: "active" | "inactive";
  permissions?: Record<string, RolePermission>;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchRoles(): Promise<Role[]> {
  const res = await apiGet("/admin/roles?limit=100");
  return res?.results?.data ?? [];
}

export async function getRoleById(id: string): Promise<Role> {
  const res = await apiGet(`/admin/roles/${id}`);
  return res?.results?.role;
}

export async function createRole(payload: {
  name: string;
  description?: string;
  status?: string;
  permissions?: Record<string, RolePermission>;
}): Promise<Role> {
  const res = await apiPost("/admin/roles", payload);
  return res?.results?.role;
}

export async function updateRole(
  id: string,
  payload: {
    name?: string;
    description?: string;
    status?: string;
    permissions?: Record<string, RolePermission>;
  },
): Promise<Role> {
  const res = await apiPut(`/admin/roles/${id}`, payload);
  return res?.results?.role;
}

export async function deleteRole(id: string): Promise<void> {
  const res = await apiDelete(`/admin/roles/${id}`);
  return res?.results;
}

export async function fetchPermissionModules() {
  const res = await apiGet("/admin/roles/modules");
  return res?.results?.modules ?? [];
}
