import { 
  type LoginInput, 
  type RegisterInput, 
  type ForgotPasswordInput, 
  type ResetPasswordInput,
  type User 
} from '../schema';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Mock JWT token generation (in real app, use proper JWT library)
const generateToken = (userId: number): string => {
  return `jwt_token_${userId}_${Date.now()}`;
};

// Mock password hashing (in real app, use bcrypt)
const hashPassword = (password: string): string => {
  return `hashed_${password}`;
};

// Mock password verification (in real app, use bcrypt.compare)
const verifyPassword = (password: string, hashedPassword: string): boolean => {
  return hashedPassword === `hashed_${password}`;
};

// Mock OTP generation and storage (in real app, use Redis or database)
const otpStore = new Map<string, { code: string; expires: Date }>();

const generateOTP = (): string => {
  return Math.random().toString().slice(2, 8); // 6 digit OTP
};

export async function login(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    if (!verifyPassword(input.password, user.password)) {
      throw new Error('Invalid email or password');
    }

    // Update remember_me setting if provided
    if (input.remember_me !== undefined) {
      await db.update(usersTable)
        .set({ 
          remember_me: input.remember_me,
          updated_at: new Date()
        })
        .where(eq(usersTable.id, user.id))
        .execute();

      user.remember_me = input.remember_me;
    }

    // Generate token
    const token = generateToken(user.id);

    return {
      user: {
        ...user,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at)
      } as User,
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function register(input: RegisterInput): Promise<{ user: User; message: string }> {
  try {
    // Validate passwords match
    if (input.password !== input.confirm_password) {
      throw new Error("Passwords don't match");
    }

    // Check if user already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = hashPassword(input.password);

    // Create user
    const result = await db.insert(usersTable)
      .values({
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: input.role || 'USER',
        is_verified: false,
        is_active: true,
        remember_me: false,
        theme: 'SYSTEM'
      })
      .returning()
      .execute();

    const user = result[0];

    return {
      user: {
        ...user,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at)
      } as User,
      message: 'Registration successful. Please check your email for verification.'
    };
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
  try {
    // Check if user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('User with this email does not exist');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Generate OTP and store it (expires in 15 minutes)
    const otpCode = generateOTP();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);

    otpStore.set(input.email, { code: otpCode, expires });

    // In real app, send email with OTP
    console.log(`OTP for ${input.email}: ${otpCode}`);

    return {
      message: 'Password reset code sent to your email.'
    };
  } catch (error) {
    console.error('Forgot password failed:', error);
    throw error;
  }
}

export async function resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
  try {
    // Check if user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('User with this email does not exist');
    }

    const user = users[0];

    // Verify OTP
    const storedOTP = otpStore.get(input.email);
    if (!storedOTP) {
      throw new Error('No password reset request found');
    }

    if (new Date() > storedOTP.expires) {
      otpStore.delete(input.email);
      throw new Error('Password reset code has expired');
    }

    if (storedOTP.code !== input.otp_code) {
      throw new Error('Invalid password reset code');
    }

    // Hash new password and update user
    const hashedPassword = hashPassword(input.new_password);

    await db.update(usersTable)
      .set({ 
        password: hashedPassword,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, user.id))
      .execute();

    // Clean up OTP
    otpStore.delete(input.email);

    return {
      message: 'Password reset successful. You can now login with your new password.'
    };
  } catch (error) {
    console.error('Reset password failed:', error);
    throw error;
  }
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  try {
    // In real app, decode JWT token or lookup verification token in database
    // For now, assume token format is "verify_email_{user_id}_{timestamp}"
    const parts = token.split('_');
    if (parts.length < 3 || parts[0] !== 'verify' || parts[1] !== 'email') {
      throw new Error('Invalid verification token');
    }

    const userId = parseInt(parts[2]);
    if (isNaN(userId)) {
      throw new Error('Invalid verification token');
    }

    // Find user
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    if (user.is_verified) {
      return {
        message: 'Email is already verified.'
      };
    }

    // Update verification status
    await db.update(usersTable)
      .set({ 
        is_verified: true,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, user.id))
      .execute();

    return {
      message: 'Email verified successfully.'
    };
  } catch (error) {
    console.error('Email verification failed:', error);
    throw error;
  }
}

export async function logout(): Promise<{ message: string }> {
  try {
    // In real app, invalidate JWT token (add to blacklist, etc.)
    // For stateless JWT, client should just discard the token
    return {
      message: 'Logged out successfully.'
    };
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}