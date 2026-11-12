import { Types } from "mongoose";

export type DeviceType = "web" | "android" | "ios";

export interface NotificationDevice {
  token: string;
  type: DeviceType;
}

export interface CreateNotificationInput {
  receiverUserId: Types.ObjectId | string;
  senderId?: Types.ObjectId | string;
  title: string;
  description: string;
  dataId?: string;
}

export interface SendPushNotificationInput {
  receiverUserId: Types.ObjectId | string;
  title: string;
  description: string;
  senderId?: Types.ObjectId | string;
  dataId?: string;
  deviceToken?: string;
  deviceType?: DeviceType;
  notificationEnabled?: boolean;
  data?: Record<string, string | number | boolean>;
  saveToDb?: boolean;
  emitSocket?: boolean;
}

export interface SendNotificationToDeviceInput {
  devices: NotificationDevice[];
  title: string;
  description: string;
  data?: Record<string, string | number | boolean>;
  badgeCount?: number;
}

export interface NotificationSocketData {
  success: boolean;
  hasNewNotification: boolean;
  count: number;
  notificationData: any;
}

export interface NotificationMessageData {
  success: boolean;
  newNotificationMessage: boolean;
  message: string;
}
