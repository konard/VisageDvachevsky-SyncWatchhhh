import { nanoid } from 'nanoid';
import { env } from '../../config/env.js';
import { prisma } from './prisma.js';

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Parse duration string (e.g., '15m', '7d') to milliseconds
 */
function parseDuration(duration: string): number {
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
 * Generate JWT access token (short-lived)
 */
export function generateAccessToken(payload: TokenPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = Math.floor(parseDuration(env.JWT_EXPIRES_IN) / 1000);

  const claims = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createSignature(`${header}.${payloadBase64}`);

  return `${header}.${payloadBase64}.${signature}`;
}

/**
 * Generate refresh token and store in database
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const token = nanoid(64);
  const expiresIn = parseDuration(env.JWT_REFRESH_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expiresIn);

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify and decode JWT access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSignature = createSignature(`${header}.${payload}`);

    if (signature !== expectedSignature) return null;

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);

    if (claims.exp && claims.exp < now) return null;

    return {
      userId: claims.userId,
      email: claims.email,
      username: claims.username,
    };
  } catch {
    return null;
  }
}

/**
 * Verify refresh token from database
 */
export async function verifyRefreshToken(token: string): Promise<string | null> {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!refreshToken) return null;
  if (refreshToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: refreshToken.id } });
    return null;
  }

  return refreshToken.userId;
}

/**
 * Revoke refresh token
 */
export async function revokeRefreshToken(token: string): Promise<boolean> {
  try {
    await prisma.refreshToken.delete({ where: { token } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create HMAC-SHA256 signature
 */
function createSignature(data: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(data)
    .digest('base64url');
}
