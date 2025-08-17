import { db } from '../db';
import { notificationsTable, usersTable } from '../db/schema';
import { 
  type Notification, 
  type CreateNotificationInput 
} from '../schema';
import { eq, and, desc, count } from 'drizzle-orm';

export async function getNotifications(userId: number): Promise<Notification[]> {
  try {
    const results = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, userId))
      .orderBy(desc(notificationsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    throw error;
  }
}

export async function getNotificationById(id: number): Promise<Notification | null> {
  try {
    const results = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch notification by ID:', error);
    throw error;
  }
}

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  try {
    // Verify user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    const results = await db.insert(notificationsTable)
      .values({
        user_id: input.user_id,
        type: input.type,
        title: input.title,
        content: input.content,
        is_read: false
      })
      .returning()
      .execute();

    return results[0];
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

export async function markNotificationAsRead(id: number): Promise<Notification> {
  try {
    const results = await db.update(notificationsTable)
      .set({ 
        is_read: true
      })
      .where(eq(notificationsTable.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error(`Notification with ID ${id} not found`);
    }

    return results[0];
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

export async function deleteNotification(id: number): Promise<{ message: string }> {
  try {
    const results = await db.delete(notificationsTable)
      .where(eq(notificationsTable.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error(`Notification with ID ${id} not found`);
    }

    return {
      message: 'Notification deleted successfully.'
    };
  } catch (error) {
    console.error('Failed to delete notification:', error);
    throw error;
  }
}

export async function getUnreadNotificationCount(userId: number): Promise<{ count: number }> {
  try {
    const results = await db.select({
      count: count()
    })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.user_id, userId),
          eq(notificationsTable.is_read, false)
        )
      )
      .execute();

    return {
      count: results[0]?.count || 0
    };
  } catch (error) {
    console.error('Failed to get unread notification count:', error);
    throw error;
  }
}

export async function createLoginNotification(userId: number): Promise<Notification> {
  try {
    const input: CreateNotificationInput = {
      user_id: userId,
      type: 'LOGIN',
      title: 'Login Successful',
      content: 'You have successfully logged in to the CCTV monitoring system.'
    };

    return await createNotification(input);
  } catch (error) {
    console.error('Failed to create login notification:', error);
    throw error;
  }
}

export async function createStreamEventNotification(userId: number, cctvName: string, event: string): Promise<Notification> {
  try {
    const input: CreateNotificationInput = {
      user_id: userId,
      type: 'STREAM_EVENT',
      title: 'CCTV Stream Event',
      content: `${cctvName}: ${event}`
    };

    return await createNotification(input);
  } catch (error) {
    console.error('Failed to create stream event notification:', error);
    throw error;
  }
}