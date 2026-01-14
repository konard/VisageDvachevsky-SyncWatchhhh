# ADR-0001: Socket.io for Real-time Communication

## Status
Accepted

## Context
SyncWatch requires bidirectional real-time communication between the server and multiple clients to synchronize video playback, voice chat signaling, and chat messages. The solution must support:

- Low-latency command broadcasting to all participants in a room
- Reliable message delivery for critical sync commands
- Automatic reconnection handling
- Room-based message routing
- Support for both authenticated users and guests
- Easy integration with TypeScript/Node.js ecosystem

## Decision
We will use **Socket.io** as our real-time communication framework for WebSocket connections between the frontend and backend.

## Consequences

### Positive
- **Mature ecosystem**: Well-tested library with extensive documentation and community support
- **Automatic reconnection**: Built-in reconnection logic with exponential backoff
- **Room support**: Native concept of "rooms" for broadcasting messages to groups of clients
- **Fallback transports**: Automatic fallback to long-polling if WebSocket connection fails
- **TypeScript support**: Strong typing for events and payloads
- **Middleware support**: Easy to add authentication, rate limiting, and logging
- **Binary support**: Can transmit binary data for future features (e.g., file sharing)

### Negative
- **Larger bundle size**: Socket.io client is larger (~50KB) compared to native WebSocket
- **Custom protocol**: Uses a custom protocol over WebSocket, not pure WebSocket
- **Server affinity**: Requires sticky sessions or Redis adapter for horizontal scaling
- **Overhead**: Additional message framing adds small latency overhead

### Risks
- **Scaling complexity**: Multi-server deployments require Redis pub/sub adapter
- **Migration difficulty**: Hard to migrate away from Socket.io due to custom protocol

## Alternatives Considered

### Alternative 1: Native WebSocket
- **Pros**: Smaller client size, browser standard, no custom protocol
- **Cons**: No automatic reconnection, no room concept, manual heartbeat implementation, no TypeScript event typing
- **Verdict**: Too low-level; would require reimplementing Socket.io features

### Alternative 2: Server-Sent Events (SSE)
- **Pros**: Simple, built into browsers, works with HTTP/2
- **Cons**: Unidirectional only (server → client), no binary support, limited browser connections
- **Verdict**: Cannot support client-initiated commands (play/pause/seek)

### Alternative 3: GraphQL Subscriptions
- **Pros**: Type-safe schema, unified with existing GraphQL API
- **Cons**: Heavier protocol, complex for simple pub/sub, requires Apollo or similar
- **Verdict**: Over-engineered for real-time messaging use case

### Alternative 4: WebRTC Data Channels
- **Pros**: P2P communication, very low latency
- **Cons**: Complex NAT traversal, requires TURN server, no server-mediated sync
- **Verdict**: Inappropriate for centralized playback synchronization

## References
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Socket.io Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- Technical Specification Section 4.2: WebSocket Protocol
- backend/src/websocket/index.ts
