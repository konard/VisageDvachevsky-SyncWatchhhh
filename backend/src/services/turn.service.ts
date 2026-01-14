import crypto from 'crypto';
import { env } from '../config/env.js';

export interface TURNCredentials {
  urls: string[];
  username: string;
  credential: string;
  credentialType: 'password';
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: 'password';
}

/**
 * Generate time-limited TURN credentials using HMAC-SHA1
 * Based on RFC 5389 and coturn's REST API
 */
export function generateTURNCredentials(userId: string): TURNCredentials {
  const ttl = env.TURN_CREDENTIAL_TTL;
  const unixTimestamp = Math.floor(Date.now() / 1000) + ttl;

  // Username format: timestamp:userId
  const username = `${unixTimestamp}:${userId}`;

  // Generate HMAC-SHA1 credential
  const turnSecret = env.TURN_SECRET || 'default_turn_secret_change_in_production';
  const hmac = crypto.createHmac('sha1', turnSecret);
  hmac.update(username);
  const credential = hmac.digest('base64');

  // Parse TURN URL to generate all transport variants
  const turnUrl = env.TURN_SERVER_URL || 'turn:localhost:3478';
  const urls = [
    turnUrl,
    turnUrl.replace('turn:', 'turn:') + '?transport=tcp',
    turnUrl.replace('turn:', 'turns:').replace(':3478', ':5349') + '?transport=tcp',
  ];

  return {
    urls,
    username,
    credential,
    credentialType: 'password',
  };
}

/**
 * Get ICE servers configuration for WebRTC
 */
export function getIceServers(userId: string): IceServer[] {
  const turnCredentials = generateTURNCredentials(userId);

  return [
    // Public STUN servers (fallback)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },

    // Private TURN server with credentials
    {
      urls: turnCredentials.urls,
      username: turnCredentials.username,
      credential: turnCredentials.credential,
      credentialType: turnCredentials.credentialType,
    },
  ];
}
