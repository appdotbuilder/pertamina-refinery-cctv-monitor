import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN']);
export const cctvStatusEnum = pgEnum('cctv_status', ['ONLINE', 'OFFLINE', 'MAINTENANCE']);
export const themeEnum = pgEnum('theme', ['LIGHT', 'DARK', 'SYSTEM']);
export const notificationTypeEnum = pgEnum('notification_type', ['LOGIN', 'MESSAGE', 'STREAM_EVENT']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(), // Hashed password
  role: userRoleEnum('role').notNull().default('USER'),
  is_verified: boolean('is_verified').notNull().default(false),
  is_active: boolean('is_active').notNull().default(true),
  remember_me: boolean('remember_me').notNull().default(false),
  theme: themeEnum('theme').notNull().default('SYSTEM'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Buildings table
export const buildingsTable = pgTable('buildings', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: numeric('longitude', { precision: 11, scale: 8 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Rooms table
export const roomsTable = pgTable('rooms', {
  id: serial('id').primaryKey(),
  building_id: integer('building_id').notNull().references(() => buildingsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  floor: integer('floor').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// CCTV table
export const cctvTable = pgTable('cctv', {
  id: serial('id').primaryKey(),
  room_id: integer('room_id').notNull().references(() => roomsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  ip_address: text('ip_address').notNull(),
  rtsp_url: text('rtsp_url').notNull(),
  status: cctvStatusEnum('status').notNull().default('OFFLINE'),
  latitude: numeric('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: numeric('longitude', { precision: 11, scale: 8 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Contacts table
export const contactsTable = pgTable('contacts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  whatsapp: text('whatsapp').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Messages table
export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  sender_id: integer('sender_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  receiver_id: integer('receiver_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  is_read: boolean('is_read').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Notifications table
export const notificationsTable = pgTable('notifications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  is_read: boolean('is_read').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  sentMessages: many(messagesTable, { relationName: 'sender' }),
  receivedMessages: many(messagesTable, { relationName: 'receiver' }),
  notifications: many(notificationsTable),
}));

export const buildingsRelations = relations(buildingsTable, ({ many }) => ({
  rooms: many(roomsTable),
}));

export const roomsRelations = relations(roomsTable, ({ one, many }) => ({
  building: one(buildingsTable, {
    fields: [roomsTable.building_id],
    references: [buildingsTable.id],
  }),
  cctvs: many(cctvTable),
}));

export const cctvRelations = relations(cctvTable, ({ one }) => ({
  room: one(roomsTable, {
    fields: [cctvTable.room_id],
    references: [roomsTable.id],
  }),
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  sender: one(usersTable, {
    fields: [messagesTable.sender_id],
    references: [usersTable.id],
    relationName: 'sender',
  }),
  receiver: one(usersTable, {
    fields: [messagesTable.receiver_id],
    references: [usersTable.id],
    relationName: 'receiver',
  }),
}));

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [notificationsTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Building = typeof buildingsTable.$inferSelect;
export type NewBuilding = typeof buildingsTable.$inferInsert;

export type Room = typeof roomsTable.$inferSelect;
export type NewRoom = typeof roomsTable.$inferInsert;

export type Cctv = typeof cctvTable.$inferSelect;
export type NewCctv = typeof cctvTable.$inferInsert;

export type Contact = typeof contactsTable.$inferSelect;
export type NewContact = typeof contactsTable.$inferInsert;

export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;

export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  buildings: buildingsTable,
  rooms: roomsTable,
  cctv: cctvTable,
  contacts: contactsTable,
  messages: messagesTable,
  notifications: notificationsTable,
};