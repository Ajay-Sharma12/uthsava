import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api";
function normalizeName(resource: string) {
  return resource.startsWith("/") ? resource : `/${resource}`;
}

// export async function fetchResource(resource: string, params?: Record<string, any>) {
//   const path = normalizeName(resource);
//   const res = await apiGet(path, params);
//   return Array.isArray(res) ? res : res?.data ?? res;
// }

export async function fetchResource(resource: string, params?: Record<string, any>) {
  const path = normalizeName(resource);
  return await apiGet(path, params);
}

export async function createResource(resource: string, body?: any) {
  const path = normalizeName(resource);
  const res = await apiPost(path, body);
  return res?.data ?? res;
}

export async function updateResource(resource: string, id: string, body?: any) {
  const path = `${normalizeName(resource)}/${id}`;
  const res = await apiPut(path, body);
  return res?.data ?? res;
}

export async function deleteResource(resource: string, id: string) {
  const path = `${normalizeName(resource)}/${id}`;
  const res = await apiDelete(path);
  return res?.data ?? res;
}

export async function updateCategoryStatus(id: string, status: "active" | "inactive") {
  return apiPatch(`/admin/categories/${id}/status`, {
    status,
  });
}

export async function updateCategoryDisplayOrder(id: string, displayOrder: number) {
  return apiPatch(`/admin/categories/${id}/display-order`, {
    displayOrder,
  });
}
