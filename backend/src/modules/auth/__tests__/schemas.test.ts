import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, refreshSchema } from '../schemas.js';

describe('Auth Schemas', () => {
  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        username: 'testuser',
        password: 'password123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short username', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'ab',
        password: 'password123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject username with invalid characters', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'test user!',
        password: 'password123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'short',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject too long password', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'a'.repeat(73),
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('refreshSchema', () => {
    it('should validate valid refresh token', () => {
      const validData = {
        refreshToken: 'some-refresh-token',
      };

      const result = refreshSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing refresh token', () => {
      const invalidData = {};

      const result = refreshSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
