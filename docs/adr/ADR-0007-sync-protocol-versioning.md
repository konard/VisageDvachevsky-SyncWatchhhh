# ADR-0007: Sync Protocol Versioning

## Status
Accepted

## Context
The playback synchronization protocol will evolve over time with:
- New sync command types (e.g., `SKIP_INTRO`, `ADJUST_SUBTITLE_OFFSET`)
- Enhanced state fields (e.g., quality level, subtitle track)
- Optimizations (e.g., delta updates instead of full state)
- Bug fixes in sequence number handling or drift calculation

We must support protocol changes without breaking existing clients.

## Decision
We will implement **explicit protocol versioning** in the WebSocket handshake, with the server supporting multiple protocol versions simultaneously.

## Consequences

### Positive
- **Backward compatibility**: Old clients continue working after server updates
- **Gradual rollout**: New features can be tested with subset of users
- **Client flexibility**: Users don't need to upgrade immediately
- **Debugging**: Protocol version in logs helps diagnose issues
- **Safe experiments**: Can A/B test protocol changes

### Negative
- **Code complexity**: Server must handle multiple protocol versions
- **Testing overhead**: Must test all supported version combinations
- **Technical debt**: Old protocol code accumulates over time
- **Migration pressure**: Users on old versions miss new features

### Risks
- **Version sprawl**: Supporting too many versions becomes unmaintainable
- **Security issues**: Old protocol versions may have unpatched vulnerabilities

## Implementation Details

### Version Negotiation
1. Client sends protocol version in Socket.io `auth` payload
2. Server validates and stores version in `socket.data.protocolVersion`
3. Server responds with supported version range
4. If client version unsupported, connection is rejected with upgrade prompt

### Version Format
```
{major}.{minor}
```
- **Major**: Breaking changes (incompatible state format, command structure)
- **Minor**: Backward-compatible additions (new optional commands)

### Version Support Policy
- **Current version**: Fully supported with all features
- **Previous major**: Supported for 6 months after new major release
- **Older versions**: Deprecated, show upgrade banner, drop after 12 months

### Example Handshake
```typescript
// Client
socket.auth = {
  token: '<jwt>',
  protocolVersion: '1.0'
};

// Server response
socket.emit('connection:ready', {
  protocolVersion: '1.0',
  serverSupportedVersions: ['1.0', '1.1', '2.0']
});
```

### Handling Version-Specific Logic
```typescript
// Server-side
if (socket.data.protocolVersion.startsWith('1.')) {
  // Legacy sync command format
  sendLegacySyncCommand(socket, command);
} else {
  // Modern sync command format
  sendSyncCommand(socket, command);
}
```

## Deprecation Process
1. **Announce**: Document deprecation in changelog, show warning in old clients
2. **Migration period**: 6 months with both versions supported
3. **Drop support**: Remove old version code, reject old clients with upgrade message

## Alternatives Considered

### Alternative 1: No versioning (always breaking)
- **Pros**: Simplest code, no version handling
- **Cons**: Every protocol change breaks all clients, forces synchronized deployment
- **Verdict**: Unacceptable UX, disrupts all users on every update

### Alternative 2: API versioning (URL-based /v1, /v2)
- **Pros**: Standard REST pattern, easy to proxy/route
- **Cons**: Requires separate WebSocket namespaces, more complex deployment
- **Verdict**: Overkill for WebSocket protocol, URL versioning better for REST API

### Alternative 3: Feature flags instead of versions
- **Pros**: Granular control, easier rollback
- **Cons**: Combinatorial explosion of feature combinations, hard to test
- **Verdict**: Better suited for business features, not protocol changes

### Alternative 4: Automatic version detection (sniffing)
- **Pros**: No explicit version exchange
- **Cons**: Fragile, hard to debug, fails on ambiguous messages
- **Verdict**: Too error-prone for critical sync protocol

## Version History
- **1.0** (Initial): Basic play/pause/seek/rate commands
- **1.1** (Planned): Add subtitle offset command
- **2.0** (Future): State delta updates instead of full snapshots

## References
- [Semantic Versioning](https://semver.org/)
- backend/src/websocket/types/socket.ts
- frontend/src/hooks/useSocket.ts
