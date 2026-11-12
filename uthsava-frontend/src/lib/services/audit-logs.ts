import { apiGet } from "@/lib/api";

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const fetchAuditLogs = async (params: AuditLogQuery = {}) => {
  const {
    page = 1,
    limit = 50,
    search,
    module,
    status,
    fromDate,
    toDate,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  queryParams.set("sortBy", sortBy);
  queryParams.set("sortOrder", sortOrder);
  if (search) queryParams.set("search", search);
  if (module && module !== "ALL" && module !== "All") queryParams.set("module", module);
  if (status && status !== "ALL" && status !== "All") queryParams.set("status", status);
  if (fromDate) queryParams.set("fromDate", fromDate);
  if (toDate) queryParams.set("toDate", toDate);

  const res = await apiGet(`/admin/audit-logs?${queryParams.toString()}`);
  return {
    data: res?.results?.data ?? [],
    total: res?.results?.total ?? 0,
    totalPages: res?.results?.totalPages ?? 1,
  };
};

export const getAuditLogById = async (id: string) => {
  const res = await apiGet(`/admin/audit-logs/${id}`);
  return res?.results?.log ?? null;
};
