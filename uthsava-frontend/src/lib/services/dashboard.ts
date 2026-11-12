import { apiGet } from "../api";

export async function getDashboardStats() {
  return apiGet("/admin/dashboard/stats");
}
