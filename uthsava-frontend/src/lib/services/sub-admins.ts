import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api";

export interface SubAdminQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  roleId?: string;
}

export const fetchSubAdmins = async (params: SubAdminQueryParams = {}) => {
  const { page = 1, limit = 100, search, status, roleId } = params;
  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));
  if (search) query.set("search", search);
  if (status && status !== "ALL" && status !== "All") query.set("status", status.toLowerCase());
  if (roleId && roleId !== "ALL" && roleId !== "All") query.set("roleId", roleId);

  const res = await apiGet(`/admin/sub-admins?${query.toString()}`);
  return res?.results?.data ?? [];
};

export const createSubAdmin = async (payload: {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  password?: string;
  mobile?: string;
  countryCode?: number;
  status?: string;
}) => {
  const adminUrl = typeof window !== "undefined" ? window.location.origin : undefined;
  const res = await apiPost("/admin/sub-admins", { ...payload, adminUrl });
  return res.results;
};

export const getSubAdminById = async (id: string) => {
  const res = await apiGet(`/admin/sub-admins/${id}`);
  return res.results.subAdmin;
};

export const updateSubAdmin = async (
  id: string,
  payload: {
    firstName?: string;
    lastName?: string;
    email?: string;
    roleId?: string;
    mobile?: string;
    countryCode?: number;
    status?: string;
  },
) => {
  const adminUrl = typeof window !== "undefined" ? window.location.origin : undefined;
  const res = await apiPut(`/admin/sub-admins/${id}`, { ...payload, adminUrl });
  return res.results;
};

export const updateSubAdminStatus = async (id: string, status: "active" | "inactive") => {
  const res = await apiPatch(`/admin/sub-admins/${id}/status`, { status });
  return res.results;
};

export const deleteSubAdmin = async (id: string) => {
  const res = await apiDelete(`/admin/sub-admins/${id}`);
  return res.results;
};
