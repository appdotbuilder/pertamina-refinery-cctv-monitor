import { db } from '../db';
import { messagesTable, usersTable, notificationsTable } from '../db/schema';
import { 
  type Message, 
  type CreateMessageInput 
} from '../schema';
import { eq, or, and, desc, count, asc } from 'drizzle-orm';

export async function getMessages(userId: number): Promise<Message[]> {
  try {
    const results = await db.select()
      .from(messagesTable)
      .where(or(
        eq(messagesTable.sender_id, userId),
        eq(messagesTable.receiver_id, userId)
      ))
      .orderBy(desc(messagesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get messages:', error);
    throw error;
  }
}

export async function getMessageById(id: number): Promise<Message | null> {
  try {
    const results = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to get message by ID:', error);
    throw error;
  }
}

export async function getConversation(userId1: number, userId2: number): Promise<Message[]> {
  try {
    const results = await db.select()
      .from(messagesTable)
      .where(
        or(
          and(
            eq(messagesTable.sender_id, userId1),
            eq(messagesTable.receiver_id, userId2)
          ),
          and(
            eq(messagesTable.sender_id, userId2),
            eq(messagesTable.receiver_id, userId1)
          )
        )
      )
      .orderBy(asc(messagesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get conversation:', error);
    throw error;
  }
}

export async function sendMessage(senderId: number, input: CreateMessageInput): Promise<Message> {
  try {
    // Verify sender exists
    const sender = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, senderId))
      .execute();

    if (sender.length === 0) {
      throw new Error('Sender not found');
    }

    // Verify receiver exists
    const receiver = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.receiver_id))
      .execute();

    if (receiver.length === 0) {
      throw new Error('Receiver not found');
    }

    // Insert the message
    const messageResult = await db.insert(messagesTable)
      .values({
        sender_id: senderId,
        receiver_id: input.receiver_id,
        content: input.content,
        is_read: false
      })
      .returning()
      .execute();

    const message = messageResult[0];

    // Create notification for receiver
    await db.insert(notificationsTable)
      .values({
        user_id: input.receiver_id,
        type: 'MESSAGE',
        title: 'New Message',
        content: `You have a new message from ${sender[0].name}`,
        is_read: false
      })
      .execute();

    return message;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}

export async function markMessageAsRead(id: number): Promise<Message> {
  try {
    // Check if message exists
    const existingMessage = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, id))
      .execute();

    if (existingMessage.length === 0) {
      throw new Error('Message not found');
    }

    // Update the message
    const results = await db.update(messagesTable)
      .set({ 
        is_read: true,
        updated_at: new Date()
      })
      .where(eq(messagesTable.id, id))
      .returning()
      .execute();

    return results[0];
  } catch (error) {
    console.error('Failed to mark message as read:', error);
    throw error;
  }
}

export async function deleteMessage(id: number): Promise<{ message: string }> {
  try {
    // Check if message exists
    const existingMessage = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, id))
      .execute();

    if (existingMessage.length === 0) {
      throw new Error('Message not found');
    }

    // Delete the message
    await db.delete(messagesTable)
      .where(eq(messagesTable.id, id))
      .execute();

    return {
      message: 'Message deleted successfully.'
    };
  } catch (error) {
    console.error('Failed to delete message:', error);
    throw error;
  }
}

export async function getUnreadMessageCount(userId: number): Promise<{ count: number }> {
  try {
    const results = await db.select({
      count: count(messagesTable.id)
    })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.receiver_id, userId),
          eq(messagesTable.is_read, false)
        )
      )
      .execute();

    return {
      count: results[0]?.count || 0
    };
  } catch (error) {
    console.error('Failed to get unread message count:', error);
    throw error;
  }
}