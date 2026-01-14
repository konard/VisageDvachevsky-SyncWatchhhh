import { describe, it, expect } from 'vitest';
import { generateAccessToken, verifyAccessToken, TokenPayload } from '../../../common/utils/jwt.js';

describe('JWT Utilities', () => {
  const mockPayload: TokenPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateAccessToken(mockPayload);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include payload data in token', () => {
      const token = generateAccessToken(mockPayload);
      const payload = verifyAccessToken(token);

      expect(payload).toBeTruthy();
      expect(payload?.userId).toBe(mockPayload.userId);
      expect(payload?.email).toBe(mockPayload.email);
      expect(payload?.username).toBe(mockPayload.username);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid token', () => {
      const token = generateAccessToken(mockPayload);
      const payload = verifyAccessToken(token);

      expect(payload).toBeTruthy();
      expect(payload).toMatchObject(mockPayload);
    });

    it('should reject an invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const payload = verifyAccessToken(invalidToken);

      expect(payload).toBeNull();
    });

    it('should reject a malformed token', () => {
      const malformedToken = 'not-a-jwt-token';
      const payload = verifyAccessToken(malformedToken);

      expect(payload).toBeNull();
    });

    it('should reject a token with invalid signature', () => {
      const token = generateAccessToken(mockPayload);
      const parts = token.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.invalidsignature`;
      const payload = verifyAccessToken(tamperedToken);

      expect(payload).toBeNull();
    });
  });
});
