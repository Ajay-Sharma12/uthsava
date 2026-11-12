// lib/services/notifications.ts

import { apiGet, apiPost, apiPatch } from "../api";

// API Functions - Removed /api/v1 prefix since API_BASE already includes it
export const fetchNotifications = async (params?: {
  page?: number;
  limit?: number;
}) => {
  const response = await apiGet("/admin/notifications", params);
  return response;
};

export const sendNotification = async (payload: any) => {
  const response = await apiPost("/admin/notifications", payload);
  return response;
};

export const fetchMyNotifications = async (params?: {
  page?: number;
  limit?: number;
}) => {
  const response = await apiGet("/admin/notifications/my-notifications", params);
  return response;
};

export const fetchUnreadNotificationCount = async () => {
  const response = await apiGet("/admin/notifications/unread-count");
  return response;
};

export const fetchNotificationById = async (id: string) => {
  const response = await apiGet(`/admin/notifications/${id}`);
  return response;
};

export const markAllNotificationsRead = async () => {
  const response = await apiPatch("/admin/notifications/mark-all-read", {});
  return response;
};

export const markNotificationRead = async (id: string) => {
  const response = await apiPatch(`/admin/notifications/${id}/mark-read`, {});
  return response;
};

// Export all as default for convenience
const notificationsService = {
  fetchNotifications,
  sendNotification,
  fetchMyNotifications,
  fetchUnreadNotificationCount,
  fetchNotificationById,
  markAllNotificationsRead,
  markNotificationRead,
};

export default notificationsService;