/**
 * Room Code Generation Tests
 */

import { describe, it, expect } from 'vitest';
import { generateRoomCode } from '../../../common/utils/room-code.js';
import { ROOM_CODE_LENGTH } from '@syncwatch/shared';

describe('generateRoomCode', () => {
  it('should generate code with correct length', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
  });

  it('should generate unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateRoomCode());
    }
    // All 100 codes should be unique
    expect(codes.size).toBe(100);
  });

  it('should only contain valid characters', () => {
    const code = generateRoomCode();
    const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
    expect(code).toMatch(validChars);
  });

  it('should not contain ambiguous characters', () => {
    const code = generateRoomCode();
    const ambiguousChars = /[0OI1]/;
    expect(code).not.toMatch(ambiguousChars);
  });
});
