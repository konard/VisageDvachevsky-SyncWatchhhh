/**
 * Room Schema Validation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  createRoomSchema,
  joinRoomSchema,
  updateRoomSchema,
} from '../schemas.js';

describe('createRoomSchema', () => {
  it('should validate valid input', () => {
    const input = {
      name: 'My Room',
      maxParticipants: 5,
      password: 'secret123',
      playbackControl: 'owner_only' as const,
    };

    const result = createRoomSchema.parse(input);
    expect(result.name).toBe('My Room');
    expect(result.maxParticipants).toBe(5);
    expect(result.playbackControl).toBe('owner_only');
  });

  it('should apply default values', () => {
    const input = {};
    const result = createRoomSchema.parse(input);
    expect(result.name).toBe('Watch Room');
    expect(result.maxParticipants).toBe(5);
    expect(result.playbackControl).toBe('owner_only');
  });

  it('should reject invalid maxParticipants', () => {
    expect(() =>
      createRoomSchema.parse({ maxParticipants: 1 })
    ).toThrow();
    expect(() =>
      createRoomSchema.parse({ maxParticipants: 6 })
    ).toThrow();
  });

  it('should reject short password', () => {
    expect(() => createRoomSchema.parse({ password: 'abc' })).toThrow();
  });

  it('should reject long room name', () => {
    const longName = 'a'.repeat(51);
    expect(() => createRoomSchema.parse({ name: longName })).toThrow();
  });
});

describe('joinRoomSchema', () => {
  it('should validate valid input', () => {
    const input = {
      password: 'secret123',
      guestName: 'Guest User',
    };

    const result = joinRoomSchema.parse(input);
    expect(result.password).toBe('secret123');
    expect(result.guestName).toBe('Guest User');
  });

  it('should allow empty input', () => {
    const result = joinRoomSchema.parse({});
    expect(result.password).toBeUndefined();
    expect(result.guestName).toBeUndefined();
  });

  it('should reject long guest name', () => {
    const longName = 'a'.repeat(31);
    expect(() => joinRoomSchema.parse({ guestName: longName })).toThrow();
  });
});

describe('updateRoomSchema', () => {
  it('should validate valid input', () => {
    const input = {
      name: 'Updated Room',
      maxParticipants: 3,
      playbackControl: 'all' as const,
    };

    const result = updateRoomSchema.parse(input);
    expect(result.name).toBe('Updated Room');
    expect(result.maxParticipants).toBe(3);
    expect(result.playbackControl).toBe('all');
  });

  it('should allow null password to remove it', () => {
    const result = updateRoomSchema.parse({ password: null });
    expect(result.password).toBeNull();
  });

  it('should allow partial updates', () => {
    const result = updateRoomSchema.parse({ name: 'New Name' });
    expect(result.name).toBe('New Name');
    expect(result.maxParticipants).toBeUndefined();
  });
});
