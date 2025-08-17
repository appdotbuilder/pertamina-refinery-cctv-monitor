import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  loginInputSchema,
  registerInputSchema,
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
  createBuildingInputSchema,
  updateBuildingInputSchema,
  searchBuildingInputSchema,
  createRoomInputSchema,
  updateRoomInputSchema,
  createCctvInputSchema,
  updateCctvInputSchema,
  cctvFilterInputSchema,
  cctvStatusEnum,
  userRoleEnum,
  createContactInputSchema,
  updateContactInputSchema,
  createMessageInputSchema,
  createNotificationInputSchema,
  updateProfileInputSchema,
  changePasswordInputSchema
} from './schema';

// Import handlers
import { login, register, forgotPassword, resetPassword, verifyEmail, logout } from './handlers/auth';
import { getUsers, getUserById, updateUser, deleteUser, changePassword, toggleUserStatus } from './handlers/users';
import { 
  getBuildings, 
  getBuildingById, 
  createBuilding, 
  updateBuilding, 
  deleteBuilding, 
  searchBuildings,
  initializePertaminaBuildings 
} from './handlers/buildings';
import { 
  getRooms, 
  getRoomById, 
  getRoomsByBuildingId, 
  createRoom, 
  updateRoom, 
  deleteRoom 
} from './handlers/rooms';
import { 
  getCctvs, 
  getCctvById, 
  getCctvsByRoomId, 
  getCctvsByBuildingId, 
  getFilteredCctvs,
  createCctv, 
  updateCctv, 
  updateCctvStatus,
  deleteCctv, 
  getCctvStream,
  initializeCctvSamples 
} from './handlers/cctv';
import { getContacts, getContactById, createContact, updateContact, deleteContact } from './handlers/contacts';
import { 
  getMessages, 
  getMessageById, 
  getConversation, 
  sendMessage, 
  markMessageAsRead, 
  deleteMessage,
  getUnreadMessageCount 
} from './handlers/messages';
import { 
  getNotifications, 
  getNotificationById, 
  createNotification, 
  markNotificationAsRead, 
  deleteNotification,
  getUnreadNotificationCount,
  createLoginNotification,
  createStreamEventNotification 
} from './handlers/notifications';
import { getDashboardAnalytics, getUserDashboardStats, exportDashboardData } from './handlers/dashboard';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  auth: router({
    login: publicProcedure
      .input(loginInputSchema)
      .mutation(({ input }) => login(input)),
    register: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        confirm_password: z.string().min(6),
        role: userRoleEnum.optional()
      }).refine(data => data.password === data.confirm_password, {
        message: "Passwords don't match",
        path: ["confirm_password"]
      }))
      .mutation(({ input }) => register(input)),
    forgotPassword: publicProcedure
      .input(forgotPasswordInputSchema)
      .mutation(({ input }) => forgotPassword(input)),
    resetPassword: publicProcedure
      .input(z.object({
        email: z.string().email(),
        otp_code: z.string().length(6),
        new_password: z.string().min(6)
      }))
      .mutation(({ input }) => resetPassword(input)),
    verifyEmail: publicProcedure
      .input(z.string())
      .mutation(({ input }) => verifyEmail(input)),
    logout: publicProcedure
      .mutation(() => logout()),
  }),

  // User management routes
  users: router({
    getAll: publicProcedure
      .query(() => getUsers()),
    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => getUserById(input)),
    update: publicProcedure
      .input(z.object({ id: z.number() }).merge(updateProfileInputSchema))
      .mutation(({ input }) => updateUser(input.id, input)),
    delete: publicProcedure
      .input(z.number())
      .mutation(({ input }) => deleteUser(input)),
    changePassword: publicProcedure
      .input(z.object({ 
        userId: z.number(),
        current_password: z.string().min(1),
        new_password: z.string().min(6),
        confirm_password: z.string().min(6)
      }).refine(data => data.new_password === data.confirm_password, {
        message: "Passwords don't match",
        path: ["confirm_password"]
      }))
      .mutation(({ input }) => changePassword(input.userId, {
        current_password: input.current_password,
        new_password: input.new_password,
        confirm_password: input.confirm_password
      })),
    toggleStatus: publicProcedure
      .input(z.number())
      .mutation(({ input }) => toggleUserStatus(input)),
  }),

  // Building management routes
  buildings: router({
    getAll: publicProcedure
      .query(() => getBuildings()),
    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => getBuildingById(input)),
    create: publicProcedure
      .input(createBuildingInputSchema)
      .mutation(({ input }) => createBuilding(input)),
    update: publicProcedure
      .input(updateBuildingInputSchema)
      .mutation(({ input }) => updateBuilding(input)),
    delete: publicProcedure
      .input(z.number())
      .mutation(({ input }) => deleteBuilding(input)),
    search: publicProcedure
      .input(searchBuildingInputSchema)
      .query(({ input }) => searchBuildings(input)),
    initializePertamina: publicProcedure
      .mutation(() => initializePertaminaBuildings()),
  }),

  // Room management routes
  rooms: router({
    getAll: publicProcedure
      .query(() => getRooms()),
    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => getRoomById(input)),
    getByBuildingId: publicProcedure
      .input(z.number())
      .query(({ input }) => getRoomsByBuildingId(input)),
    create: publicProcedure
      .input(createRoomInputSchema)
      .mutation(({ input }) => createRoom(input)),
    update: publicProcedure
      .input(updateRoomInputSchema)
      .mutation(({ input }) => updateRoom(input)),
    delete: publicProcedure
      .input(z.number())
      .mutation(({ input }) => deleteRoom(input)),
  }),

  // CCTV management routes
  cctv: router({
    getAll: publicProcedure
      .query(() => getCctvs()),
    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => getCctvById(input)),
    getByRoomId: publicProcedure
      .input(z.number())
      .query(({ input }) => getCctvsByRoomId(input)),
    getByBuildingId: publicProcedure
      .input(z.number())
      .query(({ input }) => getCctvsByBuildingId(input)),
    getFiltered: publicProcedure
      .input(cctvFilterInputSchema)
      .query(({ input }) => getFilteredCctvs(input)),
    create: publicProcedure
      .input(createCctvInputSchema)
      .mutation(({ input }) => createCctv(input)),
    update: publicProcedure
      .input(updateCctvInputSchema)
      .mutation(({ input }) => updateCctv(input)),
    updateStatus: publicProcedure
      .input(z.object({ id: z.number(), status: cctvStatusEnum }))
      .mutation(({ input }) => updateCctvStatus(input.id, input.status)),
    delete: publicProcedure
      .input(z.number())
      .mutation(({ input }) => deleteCctv(input)),
    getStream: publicProcedure
      .input(z.number())
      .query(({ input }) => getCctvStream(input)),
    initializeSamples: publicProcedure
      .mutation(() => initializeCctvSamples()),
  }),

  // Contact management routes
  contacts: router({
    getAll: publicProcedure
      .query(() => getContacts()),
    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => getContactById(input)),
    create: publicProcedure
      .input(createContactInputSchema)
      .mutation(({ input }) => createContact(input)),
    update: publicProcedure
      .input(updateContactInputSchema)
      .mutation(({ input }) => updateContact(input)),
    delete: publicProcedure
      .input(z.number())
      .mutation(({ input }) => deleteContact(input)),
  }),

  // Message management routes
  messages: router({
    getByUserId: publicProcedure
      .input(z.number())
      .query(({ input }) => getMessages(input)),
    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => getMessageById(input)),
    getConversation: publicProcedure
      .input(z.object({ userId1: z.number(), userId2: z.number() }))
      .query(({ input }) => getConversation(input.userId1, input.userId2)),
    send: publicProcedure
      .input(z.object({ senderId: z.number() }).merge(createMessageInputSchema))
      .mutation(({ input }) => sendMessage(input.senderId, input)),
    markAsRead: publicProcedure
      .input(z.number())
      .mutation(({ input }) => markMessageAsRead(input)),
    delete: publicProcedure
      .input(z.number())
      .mutation(({ input }) => deleteMessage(input)),
    getUnreadCount: publicProcedure
      .input(z.number())
      .query(({ input }) => getUnreadMessageCount(input)),
  }),

  // Notification management routes
  notifications: router({
    getByUserId: publicProcedure
      .input(z.number())
      .query(({ input }) => getNotifications(input)),
    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => getNotificationById(input)),
    create: publicProcedure
      .input(createNotificationInputSchema)
      .mutation(({ input }) => createNotification(input)),
    markAsRead: publicProcedure
      .input(z.number())
      .mutation(({ input }) => markNotificationAsRead(input)),
    delete: publicProcedure
      .input(z.number())
      .mutation(({ input }) => deleteNotification(input)),
    getUnreadCount: publicProcedure
      .input(z.number())
      .query(({ input }) => getUnreadNotificationCount(input)),
    createLogin: publicProcedure
      .input(z.number())
      .mutation(({ input }) => createLoginNotification(input)),
    createStreamEvent: publicProcedure
      .input(z.object({ userId: z.number(), cctvName: z.string(), event: z.string() }))
      .mutation(({ input }) => createStreamEventNotification(input.userId, input.cctvName, input.event)),
  }),

  // Dashboard routes
  dashboard: router({
    getAnalytics: publicProcedure
      .query(() => getDashboardAnalytics()),
    getUserStats: publicProcedure
      .query(() => getUserDashboardStats()),
    exportData: publicProcedure
      .query(() => exportDashboardData()),
  }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Pertamina CCTV Monitoring TRPC server listening at port: ${port}`);
}

start();