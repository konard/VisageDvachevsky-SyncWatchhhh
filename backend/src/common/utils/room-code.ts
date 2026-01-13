/**
 * Room Code Generation Utility
 * Generates cryptographically secure 8-character room codes
 */

import { customAlphabet } from 'nanoid';
import { ROOM_CODE_LENGTH } from '@syncwatch/shared';

// Use uppercase alphanumeric characters, excluding ambiguous ones (0, O, I, 1)
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Create a nanoid generator with custom alphabet
const generateNanoId = customAlphabet(alphabet, ROOM_CODE_LENGTH);

/**
 * Generates a cryptographically secure room code
 * @returns 8-character room code (e.g., "A2B3C4D5")
 */
export function generateRoomCode(): string {
  return generateNanoId();
}
