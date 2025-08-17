import { z } from 'zod';

// Enums
export const userRoleEnum = z.enum(['USER', 'ADMIN']);
export const cctvStatusEnum = z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']);
export const themeEnum = z.enum(['LIGHT', 'DARK', 'SYSTEM']);
export const notificationTypeEnum = z.enum(['LOGIN', 'MESSAGE', 'STREAM_EVENT']);

export type UserRole = z.infer<typeof userRoleEnum>;
export type CctvStatus = z.infer<typeof cctvStatusEnum>;
export type Theme = z.infer<typeof themeEnum>;
export type NotificationType = z.infer<typeof notificationTypeEnum>;

// User schemas
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  password: z.string(), // Hashed password
  role: userRoleEnum,
  is_verified: z.boolean(),
  is_active: z.boolean(),
  remember_me: z.boolean(),
  theme: themeEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Auth input schemas
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember_me: z.boolean().optional()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  confirm_password: z.string().min(6),
  role: userRoleEnum.optional()
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const forgotPasswordInputSchema = z.object({
  email: z.string().email()
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;

export const resetPasswordInputSchema = z.object({
  email: z.string().email(),
  otp_code: z.string().length(6),
  new_password: z.string().min(6)
});

export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

// Building schemas
export const buildingSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Building = z.infer<typeof buildingSchema>;

export const createBuildingInputSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  latitude: z.number(),
  longitude: z.number()
});

export type CreateBuildingInput = z.infer<typeof createBuildingInputSchema>;

export const updateBuildingInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

export type UpdateBuildingInput = z.infer<typeof updateBuildingInputSchema>;

// Room schemas
export const roomSchema = z.object({
  id: z.number(),
  building_id: z.number(),
  name: z.string(),
  floor: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Room = z.infer<typeof roomSchema>;

export const createRoomInputSchema = z.object({
  building_id: z.number(),
  name: z.string().min(1),
  floor: z.number().int()
});

export type CreateRoomInput = z.infer<typeof createRoomInputSchema>;

export const updateRoomInputSchema = z.object({
  id: z.number(),
  building_id: z.number().optional(),
  name: z.string().optional(),
  floor: z.number().int().optional()
});

export type UpdateRoomInput = z.infer<typeof updateRoomInputSchema>;

// CCTV schemas
export const cctvSchema = z.object({
  id: z.number(),
  room_id: z.number(),
  name: z.string(),
  ip_address: z.string().ip(),
  rtsp_url: z.string().url(),
  status: cctvStatusEnum,
  latitude: z.number(),
  longitude: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Cctv = z.infer<typeof cctvSchema>;

export const createCctvInputSchema = z.object({
  room_id: z.number(),
  name: z.string().min(1),
  ip_address: z.string().ip(),
  rtsp_url: z.string().url(),
  status: cctvStatusEnum,
  latitude: z.number(),
  longitude: z.number()
});

export type CreateCctvInput = z.infer<typeof createCctvInputSchema>;

export const updateCctvInputSchema = z.object({
  id: z.number(),
  room_id: z.number().optional(),
  name: z.string().optional(),
  ip_address: z.string().ip().optional(),
  rtsp_url: z.string().url().optional(),
  status: cctvStatusEnum.optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

export type UpdateCctvInput = z.infer<typeof updateCctvInputSchema>;

// Contact schemas
export const contactSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string(),
  whatsapp: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Contact = z.infer<typeof contactSchema>;

export const createContactInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().min(1),
  whatsapp: z.string().min(1)
});

export type CreateContactInput = z.infer<typeof createContactInputSchema>;

export const updateContactInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  whatsapp: z.string().optional()
});

export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;

// Message schemas
export const messageSchema = z.object({
  id: z.number(),
  sender_id: z.number(),
  receiver_id: z.number(),
  content: z.string(),
  is_read: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

export const createMessageInputSchema = z.object({
  receiver_id: z.number(),
  content: z.string().min(1)
});

export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;

// Notification schemas
export const notificationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  type: notificationTypeEnum,
  title: z.string(),
  content: z.string(),
  is_read: z.boolean(),
  created_at: z.coerce.date()
});

export type Notification = z.infer<typeof notificationSchema>;

export const createNotificationInputSchema = z.object({
  user_id: z.number(),
  type: notificationTypeEnum,
  title: z.string().min(1),
  content: z.string().min(1)
});

export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;

// Profile update schema
export const updateProfileInputSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  theme: themeEnum.optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

// Change password schema
export const changePasswordInputSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6),
  confirm_password: z.string().min(6)
});

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

// Dashboard analytics schemas
export const dashboardAnalyticsSchema = z.object({
  total_users: z.number(),
  online_users: z.number(),
  offline_users: z.number(),
  total_buildings: z.number(),
  total_rooms: z.number(),
  total_cctvs: z.number(),
  online_cctvs: z.number(),
  offline_cctvs: z.number(),
  maintenance_cctvs: z.number()
});

export type DashboardAnalytics = z.infer<typeof dashboardAnalyticsSchema>;

// Search schemas
export const searchBuildingInputSchema = z.object({
  query: z.string().min(1)
});

export type SearchBuildingInput = z.infer<typeof searchBuildingInputSchema>;

// Filter schemas
export const cctvFilterInputSchema = z.object({
  status: cctvStatusEnum.optional(),
  building_id: z.number().optional()
});

export type CctvFilterInput = z.infer<typeof cctvFilterInputSchema>;