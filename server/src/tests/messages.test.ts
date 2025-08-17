import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { messagesTable, usersTable, notificationsTable } from '../db/schema';
import { type CreateMessageInput } from '../schema';
import { 
  getMessages, 
  getMessageById, 
  getConversation, 
  sendMessage, 
  markMessageAsRead, 
  deleteMessage, 
  getUnreadMessageCount 
} from '../handlers/messages';
import { eq, and } from 'drizzle-orm';

// Test users
const testUser1 = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'hashedpassword123',
  role: 'USER' as const,
  is_verified: true,
  is_active: true,
  remember_me: false,
  theme: 'SYSTEM' as const
};

const testUser2 = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  password: 'hashedpassword456',
  role: 'USER' as const,
  is_verified: true,
  is_active: true,
  remember_me: false,
  theme: 'SYSTEM' as const
};

describe('Messages Handler', () => {
  let userId1: number;
  let userId2: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();
    userId1 = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();
    userId2 = user2Result[0].id;
  });

  afterEach(resetDB);

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const input: CreateMessageInput = {
        receiver_id: userId2,
        content: 'Hello, this is a test message!'
      };

      const result = await sendMessage(userId1, input);

      expect(result.id).toBeDefined();
      expect(result.sender_id).toBe(userId1);
      expect(result.receiver_id).toBe(userId2);
      expect(result.content).toBe('Hello, this is a test message!');
      expect(result.is_read).toBe(false);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create notification for receiver', async () => {
      const input: CreateMessageInput = {
        receiver_id: userId2,
        content: 'Test notification message'
      };

      await sendMessage(userId1, input);

      const notifications = await db.select()
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.user_id, userId2),
            eq(notificationsTable.type, 'MESSAGE')
          )
        )
        .execute();

      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('New Message');
      expect(notifications[0].content).toBe(`You have a new message from ${testUser1.name}`);
      expect(notifications[0].is_read).toBe(false);
    });

    it('should reject message with non-existent sender', async () => {
      const input: CreateMessageInput = {
        receiver_id: userId2,
        content: 'Test message'
      };

      await expect(sendMessage(999, input)).rejects.toThrow(/sender not found/i);
    });

    it('should reject message with non-existent receiver', async () => {
      const input: CreateMessageInput = {
        receiver_id: 999,
        content: 'Test message'
      };

      await expect(sendMessage(userId1, input)).rejects.toThrow(/receiver not found/i);
    });
  });

  describe('getMessages', () => {
    it('should get all messages for a user', async () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      const twoMinutesAgo = new Date(now.getTime() - 120000);

      // Create test messages with explicit timestamps
      await db.insert(messagesTable)
        .values([
          {
            sender_id: userId1,
            receiver_id: userId2,
            content: 'Message 1',
            is_read: false,
            created_at: twoMinutesAgo,
            updated_at: twoMinutesAgo
          },
          {
            sender_id: userId2,
            receiver_id: userId1,
            content: 'Message 2',
            is_read: false,
            created_at: oneMinuteAgo,
            updated_at: oneMinuteAgo
          },
          {
            sender_id: userId1,
            receiver_id: userId2,
            content: 'Message 3',
            is_read: true,
            created_at: now,
            updated_at: now
          }
        ])
        .execute();

      const messages = await getMessages(userId1);

      expect(messages).toHaveLength(3);
      expect(messages.every(msg => 
        msg.sender_id === userId1 || msg.receiver_id === userId1
      )).toBe(true);
      
      // Should be ordered by created_at desc (most recent first)
      expect(messages[0].content).toBe('Message 3');
      expect(messages[1].content).toBe('Message 2');
      expect(messages[2].content).toBe('Message 1');
    });

    it('should return empty array for user with no messages', async () => {
      const messages = await getMessages(userId1);
      expect(messages).toHaveLength(0);
    });
  });

  describe('getMessageById', () => {
    it('should get message by ID', async () => {
      const messageResult = await db.insert(messagesTable)
        .values({
          sender_id: userId1,
          receiver_id: userId2,
          content: 'Test message by ID',
          is_read: false
        })
        .returning()
        .execute();

      const messageId = messageResult[0].id;
      const message = await getMessageById(messageId);

      expect(message).not.toBeNull();
      expect(message!.id).toBe(messageId);
      expect(message!.content).toBe('Test message by ID');
      expect(message!.sender_id).toBe(userId1);
      expect(message!.receiver_id).toBe(userId2);
    });

    it('should return null for non-existent message ID', async () => {
      const message = await getMessageById(999);
      expect(message).toBeNull();
    });
  });

  describe('getConversation', () => {
    it('should get conversation between two users', async () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      const twoMinutesAgo = new Date(now.getTime() - 120000);

      // Create messages between two users with explicit timestamps
      await db.insert(messagesTable)
        .values([
          {
            sender_id: userId1,
            receiver_id: userId2,
            content: 'Hello Jane!',
            is_read: false,
            created_at: twoMinutesAgo,
            updated_at: twoMinutesAgo
          },
          {
            sender_id: userId2,
            receiver_id: userId1,
            content: 'Hi John!',
            is_read: false,
            created_at: oneMinuteAgo,
            updated_at: oneMinuteAgo
          },
          {
            sender_id: userId1,
            receiver_id: userId2,
            content: 'How are you?',
            is_read: false,
            created_at: now,
            updated_at: now
          }
        ])
        .execute();

      const conversation = await getConversation(userId1, userId2);

      expect(conversation).toHaveLength(3);
      expect(conversation.every(msg => 
        (msg.sender_id === userId1 && msg.receiver_id === userId2) ||
        (msg.sender_id === userId2 && msg.receiver_id === userId1)
      )).toBe(true);
      
      // Should be ordered by created_at asc (chronological order)
      expect(conversation[0].content).toBe('Hello Jane!');
      expect(conversation[1].content).toBe('Hi John!');
      expect(conversation[2].content).toBe('How are you?');
    });

    it('should return empty array for users with no conversation', async () => {
      const conversation = await getConversation(userId1, userId2);
      expect(conversation).toHaveLength(0);
    });
  });

  describe('markMessageAsRead', () => {
    it('should mark message as read', async () => {
      const messageResult = await db.insert(messagesTable)
        .values({
          sender_id: userId1,
          receiver_id: userId2,
          content: 'Unread message',
          is_read: false
        })
        .returning()
        .execute();

      const messageId = messageResult[0].id;
      const updatedMessage = await markMessageAsRead(messageId);

      expect(updatedMessage.id).toBe(messageId);
      expect(updatedMessage.is_read).toBe(true);
      expect(updatedMessage.updated_at).toBeInstanceOf(Date);
    });

    it('should reject marking non-existent message as read', async () => {
      await expect(markMessageAsRead(999)).rejects.toThrow(/message not found/i);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      const messageResult = await db.insert(messagesTable)
        .values({
          sender_id: userId1,
          receiver_id: userId2,
          content: 'Message to delete',
          is_read: false
        })
        .returning()
        .execute();

      const messageId = messageResult[0].id;
      const result = await deleteMessage(messageId);

      expect(result.message).toBe('Message deleted successfully.');

      // Verify message is deleted
      const deletedMessage = await getMessageById(messageId);
      expect(deletedMessage).toBeNull();
    });

    it('should reject deleting non-existent message', async () => {
      await expect(deleteMessage(999)).rejects.toThrow(/message not found/i);
    });
  });

  describe('getUnreadMessageCount', () => {
    it('should count unread messages for user', async () => {
      // Create messages with different read states
      await db.insert(messagesTable)
        .values([
          {
            sender_id: userId1,
            receiver_id: userId2,
            content: 'Unread message 1',
            is_read: false
          },
          {
            sender_id: userId1,
            receiver_id: userId2,
            content: 'Unread message 2',
            is_read: false
          },
          {
            sender_id: userId1,
            receiver_id: userId2,
            content: 'Read message',
            is_read: true
          },
          {
            sender_id: userId2,
            receiver_id: userId1,
            content: 'Message from user2',
            is_read: false
          }
        ])
        .execute();

      const result = await getUnreadMessageCount(userId2);

      // Should only count unread messages where user2 is the receiver
      expect(result.count).toBe(2);
    });

    it('should return zero for user with no unread messages', async () => {
      // Create only read messages
      await db.insert(messagesTable)
        .values({
          sender_id: userId1,
          receiver_id: userId2,
          content: 'Read message',
          is_read: true
        })
        .execute();

      const result = await getUnreadMessageCount(userId2);
      expect(result.count).toBe(0);
    });

    it('should return zero for user with no messages', async () => {
      const result = await getUnreadMessageCount(userId1);
      expect(result.count).toBe(0);
    });
  });
});