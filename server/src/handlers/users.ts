import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';
import { 
  type User, 
  type UpdateProfileInput, 
  type ChangePasswordInput 
} from '../schema';

// Password hashing utilities using Node.js crypto
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

export async function getUsers(): Promise<User[]> {
  try {
    const results = await db.select()
      .from(usersTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Failed to fetch user by ID:', error);
    throw error;
  }
}

export async function updateUser(id: number, input: UpdateProfileInput): Promise<User> {
  try {
    // Check if user exists
    const existingUser = await getUserById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Check if email is being updated and if it's already taken
    if (input.email && input.email !== existingUser.email) {
      const emailExists = await db.select()
        .from(usersTable)
        .where(eq(usersTable.email, input.email))
        .execute();

      if (emailExists.length > 0) {
        throw new Error('Email is already taken');
      }
    }

    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.theme !== undefined) {
      updateData.theme = input.theme;
    }

    const results = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    return results[0];
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
}

export async function deleteUser(id: number): Promise<{ message: string }> {
  try {
    // Check if user exists
    const existingUser = await getUserById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    await db.delete(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    return {
      message: 'User deleted successfully.'
    };
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw error;
  }
}

export async function changePassword(userId: number, input: ChangePasswordInput): Promise<{ message: string }> {
  try {
    // Validate passwords match
    if (input.new_password !== input.confirm_password) {
      throw new Error("Passwords don't match");
    }

    // Check if user exists and get current password
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Verify current password
    const currentPasswordValid = verifyPassword(input.current_password, existingUser.password);
    if (!currentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = hashPassword(input.new_password);

    // Update password in database
    await db.update(usersTable)
      .set({
        password: hashedPassword,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .execute();

    return {
      message: 'Password changed successfully.'
    };
  } catch (error) {
    console.error('Failed to change password:', error);
    throw error;
  }
}

export async function toggleUserStatus(id: number): Promise<User> {
  try {
    // Check if user exists
    const existingUser = await getUserById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Toggle active status
    const results = await db.update(usersTable)
      .set({
        is_active: !existingUser.is_active,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    return results[0];
  } catch (error) {
    console.error('Failed to toggle user status:', error);
    throw error;
  }
}