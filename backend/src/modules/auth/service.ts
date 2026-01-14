import { nanoid } from 'nanoid';
import { prisma } from '../../common/utils/prisma.js';
import { hashPassword, verifyPassword } from '../../common/utils/password.js';
import { generateAccessToken, generateRefreshToken, TokenPayload } from '../../common/utils/jwt.js';
import { RegisterInput, LoginInput } from './schemas.js';
import { auditLogger } from '../../common/services/audit-logger.js';
import { env } from '../../config/env.js';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    avatarUrl: string | null;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Parse duration string (e.g., '15m', '7d') to milliseconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid duration format: ${duration}`);

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }

  /**
   * Register a new user
   */
  async register(input: RegisterInput, ip: string = 'unknown'): Promise<AuthResponse> {
    const { email, username, password } = input;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new Error('Email already in use');
      }
      throw new Error('Username already taken');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate refresh token data
    const refreshTokenValue = nanoid(64);
    const expiresIn = this.parseDuration(env.JWT_REFRESH_EXPIRES_IN);
    const expiresAt = new Date(Date.now() + expiresIn);

    // Create user with nested refresh token in a single atomic operation
    // This uses Prisma's nested writes to ensure both are created together
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        refreshTokens: {
          create: {
            token: refreshTokenValue,
            expiresAt,
          },
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // Generate access token
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = generateAccessToken(tokenPayload);

    // Log audit event
    await auditLogger.log({
      eventType: 'auth.register',
      actorId: user.id,
      actorIp: ip,
      targetType: 'user',
      targetId: user.id,
      metadata: {
        email: user.email,
        username: user.username,
      },
      success: true,
    });

    return {
      user,
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  /**
   * Login existing user
   */
  async login(input: LoginInput, ip: string = 'unknown'): Promise<AuthResponse> {
    const { email, password } = input;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    if (!user) {
      // Log failed login attempt
      await auditLogger.log({
        eventType: 'auth.login_failed',
        actorIp: ip,
        targetType: 'user',
        targetId: 'unknown',
        metadata: {
          email,
          reason: 'user_not_found',
        },
        success: false,
      });
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      // Log failed login attempt
      await auditLogger.log({
        eventType: 'auth.login_failed',
        actorId: user.id,
        actorIp: ip,
        targetType: 'user',
        targetId: user.id,
        metadata: {
          email,
          reason: 'invalid_password',
        },
        success: false,
      });
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(user.id);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;

    // Log successful login
    await auditLogger.log({
      eventType: 'auth.login',
      actorId: user.id,
      actorIp: ip,
      targetType: 'user',
      targetId: user.id,
      metadata: {
        email: user.email,
      },
      success: true,
    });

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}
