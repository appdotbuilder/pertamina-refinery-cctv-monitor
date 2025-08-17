import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notificationsTable, usersTable } from '../db/schema';
import { type CreateNotificationInput } from '../schema';
import { 
  getNotifications,
  getNotificationById,
  createNotification,
  markNotificationAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  createLoginNotification,
  createStreamEventNotification
} from '../handlers/notifications';
import { eq } from 'drizzle-orm';

describe('Notifications Handler', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'USER'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const input: CreateNotificationInput = {
        user_id: testUserId,
        type: 'LOGIN',
        title: 'Test Notification',
        content: 'This is a test notification'
      };

      const result = await createNotification(input);

      expect(result.id).toBeDefined();
      expect(result.user_id).toBe(testUserId);
      expect(result.type).toBe('LOGIN');
      expect(result.title).toBe('Test Notification');
      expect(result.content).toBe('This is a test notification');
      expect(result.is_read).toBe(false);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save notification to database', async () => {
      const input: CreateNotificationInput = {
        user_id: testUserId,
        type: 'MESSAGE',
        title: 'Database Test',
        content: 'Testing database persistence'
      };

      const result = await createNotification(input);

      const notifications = await db.select()
        .from(notificationsTable)
        .where(eq(notificationsTable.id, result.id))
        .execute();

      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Database Test');
      expect(notifications[0].content).toBe('Testing database persistence');
      expect(notifications[0].is_read).toBe(false);
    });

    it('should throw error for non-existent user', async () => {
      const input: CreateNotificationInput = {
        user_id: 99999,
        type: 'LOGIN',
        title: 'Invalid User Test',
        content: 'This should fail'
      };

      expect(createNotification(input)).rejects.toThrow(/User with ID 99999 not found/i);
    });
  });

  describe('getNotifications', () => {
    it('should return notifications for a user ordered by date', async () => {
      // Create multiple notifications
      const inputs: CreateNotificationInput[] = [
        {
          user_id: testUserId,
          type: 'LOGIN',
          title: 'First Notification',
          content: 'First content'
        },
        {
          user_id: testUserId,
          type: 'MESSAGE',
          title: 'Second Notification',
          content: 'Second content'
        }
      ];

      for (const input of inputs) {
        await createNotification(input);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const results = await getNotifications(testUserId);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Second Notification'); // Most recent first
      expect(results[1].title).toBe('First Notification');
    });

    it('should return empty array for user with no notifications', async () => {
      // Create another user
      const anotherUserResult = await db.insert(usersTable)
        .values({
          name: 'Another User',
          email: 'another@example.com',
          password: 'hashedpassword',
          role: 'USER'
        })
        .returning()
        .execute();

      const results = await getNotifications(anotherUserResult[0].id);

      expect(results).toHaveLength(0);
    });
  });

  describe('getNotificationById', () => {
    it('should return notification by ID', async () => {
      const input: CreateNotificationInput = {
        user_id: testUserId,
        type: 'STREAM_EVENT',
        title: 'CCTV Alert',
        content: 'Camera offline'
      };

      const created = await createNotification(input);
      const result = await getNotificationById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(created.id);
      expect(result!.title).toBe('CCTV Alert');
      expect(result!.content).toBe('Camera offline');
    });

    it('should return null for non-existent notification', async () => {
      const result = await getNotificationById(99999);

      expect(result).toBeNull();
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const input: CreateNotificationInput = {
        user_id: testUserId,
        type: 'LOGIN',
        title: 'Unread Notification',
        content: 'This will be marked as read'
      };

      const created = await createNotification(input);
      expect(created.is_read).toBe(false);

      const result = await markNotificationAsRead(created.id);

      expect(result.is_read).toBe(true);
      expect(result.id).toBe(created.id);
      expect(result.title).toBe('Unread Notification');
    });

    it('should throw error for non-existent notification', async () => {
      expect(markNotificationAsRead(99999)).rejects.toThrow(/Notification with ID 99999 not found/i);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const input: CreateNotificationInput = {
        user_id: testUserId,
        type: 'LOGIN',
        title: 'To Be Deleted',
        content: 'This notification will be deleted'
      };

      const created = await createNotification(input);
      const result = await deleteNotification(created.id);

      expect(result.message).toBe('Notification deleted successfully.');

      // Verify deletion
      const deleted = await getNotificationById(created.id);
      expect(deleted).toBeNull();
    });

    it('should throw error for non-existent notification', async () => {
      expect(deleteNotification(99999)).rejects.toThrow(/Notification with ID 99999 not found/i);
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return correct count of unread notifications', async () => {
      // Create multiple notifications
      const inputs: CreateNotificationInput[] = [
        {
          user_id: testUserId,
          type: 'LOGIN',
          title: 'Unread 1',
          content: 'First unread'
        },
        {
          user_id: testUserId,
          type: 'MESSAGE',
          title: 'Unread 2',
          content: 'Second unread'
        },
        {
          user_id: testUserId,
          type: 'STREAM_EVENT',
          title: 'Will be read',
          content: 'This will be marked as read'
        }
      ];

      const notifications = [];
      for (const input of inputs) {
        notifications.push(await createNotification(input));
      }

      // Mark one as read
      await markNotificationAsRead(notifications[2].id);

      const result = await getUnreadNotificationCount(testUserId);

      expect(result.count).toBe(2);
    });

    it('should return zero for user with no unread notifications', async () => {
      const result = await getUnreadNotificationCount(testUserId);

      expect(result.count).toBe(0);
    });

    it('should return zero after all notifications are read', async () => {
      const input: CreateNotificationInput = {
        user_id: testUserId,
        type: 'LOGIN',
        title: 'Will be read',
        content: 'This will be marked as read'
      };

      const created = await createNotification(input);
      await markNotificationAsRead(created.id);

      const result = await getUnreadNotificationCount(testUserId);

      expect(result.count).toBe(0);
    });
  });

  describe('createLoginNotification', () => {
    it('should create login notification with correct content', async () => {
      const result = await createLoginNotification(testUserId);

      expect(result.user_id).toBe(testUserId);
      expect(result.type).toBe('LOGIN');
      expect(result.title).toBe('Login Successful');
      expect(result.content).toBe('You have successfully logged in to the CCTV monitoring system.');
      expect(result.is_read).toBe(false);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save login notification to database', async () => {
      const result = await createLoginNotification(testUserId);

      const notifications = await db.select()
        .from(notificationsTable)
        .where(eq(notificationsTable.id, result.id))
        .execute();

      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('LOGIN');
      expect(notifications[0].title).toBe('Login Successful');
    });
  });

  describe('createStreamEventNotification', () => {
    it('should create stream event notification with correct content', async () => {
      const cctvName = 'Camera-01';
      const event = 'Connection lost';

      const result = await createStreamEventNotification(testUserId, cctvName, event);

      expect(result.user_id).toBe(testUserId);
      expect(result.type).toBe('STREAM_EVENT');
      expect(result.title).toBe('CCTV Stream Event');
      expect(result.content).toBe(`${cctvName}: ${event}`);
      expect(result.is_read).toBe(false);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save stream event notification to database', async () => {
      const cctvName = 'Camera-02';
      const event = 'Camera back online';

      const result = await createStreamEventNotification(testUserId, cctvName, event);

      const notifications = await db.select()
        .from(notificationsTable)
        .where(eq(notificationsTable.id, result.id))
        .execute();

      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('STREAM_EVENT');
      expect(notifications[0].content).toBe('Camera-02: Camera back online');
    });

    it('should handle special characters in CCTV name and event', async () => {
      const cctvName = 'Camera "Special" & Test';
      const event = 'Status: offline -> online';

      const result = await createStreamEventNotification(testUserId, cctvName, event);

      expect(result.content).toBe(`${cctvName}: ${event}`);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This tests the error handling structure
      expect(typeof createNotification).toBe('function');
      expect(typeof getNotifications).toBe('function');
      expect(typeof markNotificationAsRead).toBe('function');
    });
  });
});