import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { pbkdf2Sync, randomBytes } from 'crypto';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  toggleUserStatus
} from '../handlers/users';
import type { UpdateProfileInput, ChangePasswordInput } from '../schema';

// Password hashing utilities (matching handler implementation)
const hashPassword = (password: string): string => {
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password: string, hashedPassword: string): boolean => {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
};

// Test data
const testUsers = [
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedpassword1',
    role: 'USER' as const,
    theme: 'LIGHT' as const
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'hashedpassword2',
    role: 'ADMIN' as const,
    theme: 'DARK' as const
  }
];

describe('User Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getUsers', () => {
    it('should return empty array when no users exist', async () => {
      const result = await getUsers();
      expect(result).toEqual([]);
    });

    it('should return all users', async () => {
      // Create test users
      await db.insert(usersTable).values(testUsers).execute();

      const result = await getUsers();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe');
      expect(result[0].email).toBe('john@example.com');
      expect(result[0].role).toBe('USER');
      expect(result[0].theme).toBe('LIGHT');
      expect(result[1].name).toBe('Jane Smith');
      expect(result[1].email).toBe('jane@example.com');
      expect(result[1].role).toBe('ADMIN');
      expect(result[1].theme).toBe('DARK');
    });
  });

  describe('getUserById', () => {
    it('should return null when user does not exist', async () => {
      const result = await getUserById(999);
      expect(result).toBeNull();
    });

    it('should return user when user exists', async () => {
      // Create test user
      const insertResult = await db.insert(usersTable)
        .values(testUsers[0])
        .returning()
        .execute();

      const userId = insertResult[0].id;
      const result = await getUserById(userId);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('John Doe');
      expect(result!.email).toBe('john@example.com');
      expect(result!.role).toBe('USER');
      expect(result!.id).toBe(userId);
    });
  });

  describe('updateUser', () => {
    it('should throw error when user does not exist', async () => {
      const updateData: UpdateProfileInput = {
        name: 'Updated Name'
      };

      await expect(updateUser(999, updateData)).rejects.toThrow('User not found');
    });

    it('should update user name successfully', async () => {
      // Create test user
      const insertResult = await db.insert(usersTable)
        .values(testUsers[0])
        .returning()
        .execute();

      const userId = insertResult[0].id;
      const updateData: UpdateProfileInput = {
        name: 'Updated John Doe'
      };

      const result = await updateUser(userId, updateData);

      expect(result.name).toBe('Updated John Doe');
      expect(result.email).toBe('john@example.com'); // Unchanged
      expect(result.id).toBe(userId);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update user email successfully', async () => {
      // Create test user
      const insertResult = await db.insert(usersTable)
        .values(testUsers[0])
        .returning()
        .execute();

      const userId = insertResult[0].id;
      const updateData: UpdateProfileInput = {
        email: 'newemail@example.com'
      };

      const result = await updateUser(userId, updateData);

      expect(result.email).toBe('newemail@example.com');
      expect(result.name).toBe('John Doe'); // Unchanged
      expect(result.id).toBe(userId);
    });

    it('should update user theme successfully', async () => {
      // Create test user
      const insertResult = await db.insert(usersTable)
        .values(testUsers[0])
        .returning()
        .execute();

      const userId = insertResult[0].id;
      const updateData: UpdateProfileInput = {
        theme: 'DARK'
      };

      const result = await updateUser(userId, updateData);

      expect(result.theme).toBe('DARK');
      expect(result.name).toBe('John Doe'); // Unchanged
      expect(result.id).toBe(userId);
    });

    it('should update multiple fields successfully', async () => {
      // Create test user
      const insertResult = await db.insert(usersTable)
        .values(testUsers[0])
        .returning()
        .execute();

      const userId = insertResult[0].id;
      const updateData: UpdateProfileInput = {
        name: 'Updated John',
        email: 'updated@example.com',
        theme: 'SYSTEM'
      };

      const result = await updateUser(userId, updateData);

      expect(result.name).toBe('Updated John');
      expect(result.email).toBe('updated@example.com');
      expect(result.theme).toBe('SYSTEM');
      expect(result.id).toBe(userId);
    });

    it('should throw error when email is already taken', async () => {
      // Create test users
      await db.insert(usersTable).values(testUsers).execute();

      const users = await getUsers();
      const userId = users[0].id;

      const updateData: UpdateProfileInput = {
        email: 'jane@example.com' // Email already taken by second user
      };

      await expect(updateUser(userId, updateData)).rejects.toThrow('Email is already taken');
    });

    it('should allow updating to same email (no change)', async () => {
      // Create test user
      const insertResult = await db.insert(usersTable)
        .values(testUsers[0])
        .returning()
        .execute();

      const userId = insertResult[0].id;
      const updateData: UpdateProfileInput = {
        email: 'john@example.com' // Same email
      };

      const result = await updateUser(userId, updateData);
      expect(result.email).toBe('john@example.com');
    });
  });

  describe('deleteUser', () => {
    it('should throw error when user does not exist', async () => {
      await expect(deleteUser(999)).rejects.toThrow('User not found');
    });

    it('should delete user successfully', async () => {
      // Create test user
      const insertResult = await db.insert(usersTable)
        .values(testUsers[0])
        .returning()
        .execute();

      const userId = insertResult[0].id;
      const result = await deleteUser(userId);

      expect(result.message).toBe('User deleted successfully.');

      // Verify user is deleted
      const deletedUser = await getUserById(userId);
      expect(deletedUser).toBeNull();
    });

    it('should handle cascade deletions', async () => {
      // Create test user
      const insertResult = await db.insert(usersTable)
        .values(testUsers[0])
        .returning()
        .execute();

      const userId = insertResult[0].id;

      // Delete user
      await deleteUser(userId);

      // Verify user is deleted
      const deletedUser = await getUserById(userId);
      expect(deletedUser).toBeNull();
    });
  });

  describe('changePassword', () => {
    let userId: number;
    let hashedPassword: string;

    beforeEach(async () => {
      // Hash password for testing
      hashedPassword = hashPassword('currentpassword');
      
      const insertResult = await db.insert(usersTable)
        .values({
          ...testUsers[0],
          password: hashedPassword
        })
        .returning()
        .execute();

      userId = insertResult[0].id;
    });

    it('should throw error when user does not exist', async () => {
      const changeData: ChangePasswordInput = {
        current_password: 'currentpassword',
        new_password: 'newpassword',
        confirm_password: 'newpassword'
      };

      await expect(changePassword(999, changeData)).rejects.toThrow('User not found');
    });

    it('should throw error when passwords do not match', async () => {
      const changeData: ChangePasswordInput = {
        current_password: 'currentpassword',
        new_password: 'newpassword',
        confirm_password: 'differentpassword'
      };

      await expect(changePassword(userId, changeData)).rejects.toThrow("Passwords don't match");
    });

    it('should throw error when current password is incorrect', async () => {
      const changeData: ChangePasswordInput = {
        current_password: 'wrongpassword',
        new_password: 'newpassword',
        confirm_password: 'newpassword'
      };

      await expect(changePassword(userId, changeData)).rejects.toThrow('Current password is incorrect');
    });

    it('should change password successfully', async () => {
      const changeData: ChangePasswordInput = {
        current_password: 'currentpassword',
        new_password: 'newpassword123',
        confirm_password: 'newpassword123'
      };

      const result = await changePassword(userId, changeData);

      expect(result.message).toBe('Password changed successfully.');

      // Verify password was changed in database
      const updatedUser = await getUserById(userId);
      expect(updatedUser).not.toBeNull();
      
      // Verify new password works
      const newPasswordValid = verifyPassword('newpassword123', updatedUser!.password);
      expect(newPasswordValid).toBe(true);
      
      // Verify old password doesn't work
      const oldPasswordValid = verifyPassword('currentpassword', updatedUser!.password);
      expect(oldPasswordValid).toBe(false);
    });
  });

  describe('toggleUserStatus', () => {
    it('should throw error when user does not exist', async () => {
      await expect(toggleUserStatus(999)).rejects.toThrow('User not found');
    });

    it('should toggle user from active to inactive', async () => {
      // Create active user
      const insertResult = await db.insert(usersTable)
        .values({
          ...testUsers[0],
          is_active: true
        })
        .returning()
        .execute();

      const userId = insertResult[0].id;
      const result = await toggleUserStatus(userId);

      expect(result.is_active).toBe(false);
      expect(result.id).toBe(userId);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should toggle user from inactive to active', async () => {
      // Create inactive user
      const insertResult = await db.insert(usersTable)
        .values({
          ...testUsers[0],
          is_active: false
        })
        .returning()
        .execute();

      const userId = insertResult[0].id;
      const result = await toggleUserStatus(userId);

      expect(result.is_active).toBe(true);
      expect(result.id).toBe(userId);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should persist status change in database', async () => {
      // Create active user
      const insertResult = await db.insert(usersTable)
        .values({
          ...testUsers[0],
          is_active: true
        })
        .returning()
        .execute();

      const userId = insertResult[0].id;
      
      // Toggle status
      await toggleUserStatus(userId);
      
      // Verify status was persisted
      const updatedUser = await getUserById(userId);
      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.is_active).toBe(false);
    });
  });
});