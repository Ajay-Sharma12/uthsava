import { apiGet, apiPost, apiPut, apiPatch } from "../api";

export function fetchCoupons(search = "") {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";

  return apiGet(`/admin/coupons${query}`);
}

export function createCoupon(payload: any) {
  return apiPost("/admin/coupons", payload);
}

export function updateCoupon(id: string, payload: any) {
  return apiPut(`/admin/coupons/${id}`, payload);
}

export function updateCouponStatus(id: string, payload: any) {
  return apiPatch(`/admin/coupons/${id}/status`, payload);
}

export function assignCouponUsers(id: string, payload: any) {
  return apiPatch(`/admin/coupons/${id}/assign-users`, payload);
}
export function getCouponById(id: string) {
  return apiGet(`/admin/coupons/${id}`);
}
