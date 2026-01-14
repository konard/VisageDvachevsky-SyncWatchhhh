/**
 * Re-export useSocket from websocket directory
 * This file exists for backwards compatibility with imports expecting useSocket
 * at this location.
 */
export { useSocket } from './websocket/useSocket';
export type { ConnectionStatus } from './websocket/useSocket';
