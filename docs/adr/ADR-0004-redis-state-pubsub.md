# ADR-0004: Redis for State and Pub/Sub

## Status
Accepted

## Context
SyncWatch requires:
- Shared playback state across multiple server instances for horizontal scaling
- Real-time pub/sub for Socket.io room events across server nodes
- Fast session storage and caching
- Rate limiting state with TTL support
- Voice participant tracking with automatic expiry

## Decision
We will use **Redis** as our primary in-memory data store for state management and pub/sub messaging.

## Consequences

### Positive
- **High performance**: Sub-millisecond read/write latency for state operations
- **Horizontal scaling**: Socket.io Redis adapter enables multi-server deployments
- **TTL support**: Automatic expiry for room state, sessions, and rate limits
- **Pub/Sub**: Built-in publish/subscribe for event broadcasting
- **Data structures**: Rich data types (strings, hashes, sets, sorted sets) for various use cases
- **Persistence options**: Optional RDB/AOF for state recovery after crashes

### Negative
- **Memory cost**: All data stored in RAM, expensive for large datasets
- **Single point of failure**: Requires Redis cluster or sentinel for high availability
- **Data loss risk**: In-memory storage can lose data on crash (if persistence disabled)
- **Network dependency**: Server crashes if Redis is unreachable

### Risks
- **Memory exhaustion**: Need monitoring and eviction policies for unbounded growth
- **Split brain**: Redis cluster partitions can cause inconsistent state

## Use Cases
1. **Playback state**: Current video position, play/pause status, sequence numbers
2. **Socket.io adapter**: Broadcast events across multiple backend servers
3. **Rate limiting**: Token bucket counters with automatic expiry
4. **Voice participants**: Active voice peers with 24-hour TTL
5. **Room participants**: Online user tracking
6. **Session cache**: Reduce database queries for active sessions

## Alternatives Considered

### Alternative 1: PostgreSQL only (no Redis)
- **Pros**: Single database, simpler architecture, ACID guarantees
- **Cons**: Too slow for real-time state updates, no pub/sub for Socket.io scaling
- **Verdict**: Unacceptable latency for playback synchronization

### Alternative 2: In-memory state (process memory)
- **Pros**: Zero infrastructure, maximum performance
- **Cons**: Cannot scale horizontally, state lost on restart, no cross-server communication
- **Verdict**: Blocks horizontal scaling and high availability

### Alternative 3: Memcached
- **Pros**: Simple, fast, lower memory overhead than Redis
- **Cons**: No pub/sub, no complex data structures, no persistence
- **Verdict**: Insufficient for Socket.io adapter and complex state management

### Alternative 4: Kafka/RabbitMQ for pub/sub
- **Pros**: Better message guarantees, persistent queues
- **Cons**: Over-engineered, slower than Redis pub/sub, no state storage
- **Verdict**: Too heavy for real-time event broadcasting

## Configuration
- **Eviction policy**: `allkeys-lru` (evict least recently used keys when memory full)
- **Max memory**: Set based on server resources
- **Persistence**: RDB snapshots every 5 minutes (balance between durability and performance)
- **Sentinel**: 3-node sentinel cluster for automatic failover in production

## References
- [Redis Documentation](https://redis.io/documentation)
- [Socket.io Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [ioredis Client](https://github.com/redis/ioredis)
- backend/src/database/redis.ts
- backend/src/modules/state/service.ts
