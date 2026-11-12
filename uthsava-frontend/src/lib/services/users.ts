import { apiGet, apiPatch, apiPost } from "../api";

export type AccountStatus = "active" | "inactive" | "suspended" | "deleted";
export type SubscriptionStatus = "active" | "inactive" | "suspended" | "expired" | "none" | "trial";

export interface UserSubscription {
  plan?: string;
  name?: string;
  planType?: string;
  currentPlan?: string;
  status?: string;
  startDate?: string;
  expiryDate?: string;
  autoRenew?: boolean;
}

export interface UserRecord {
  id: string;
  userId?: number | string;
  name: string;
  email: string;
  mobile: string;
  countryCode?: number | string;
  country?: string;
  state?: string;
  city?: string;
  dateOfBirth?: string;
  gender?: string;
  role?: string;

  isEmailVerified?: boolean;
  isMobileVerified?: boolean;

  activeSubscriptionPlan?: string | null;
  subscriptionStatus?: string;
  subscription?: UserSubscription | null;

  registrationDate?: string;
  lastLoginDate?: string;
  accountStatus: string;
  loginType?: string;

  profileImageUrl?: string;
}

export function getUsers(params?: Record<string, any>) {
  return apiGet("/admin/users", {
    limit: 100,
    page: 1,
    ...params,
  });
}

export function getUsersLookup(params?: Record<string, any>) {
  return apiGet("/admin/users/lookup", {
    limit: 300,
    ...params,
  });
}

export function getUserById(userId: string) {
  return apiGet(`/admin/users/${userId}`);
}

export function updateUser(userId: string, payload: Record<string, any>) {
  return apiPatch(`/admin/users/${userId}`, payload);
}

export function updateUserStatus(userId: string, payload: { status: string; reason?: string }) {
  return apiPatch(`/admin/users/${userId}/status`, payload);
}
