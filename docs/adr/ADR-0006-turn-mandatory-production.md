# ADR-0006: TURN Mandatory for Production

## Status
Accepted

## Context
WebRTC peer connections for voice chat require NAT traversal to work across different network configurations. The connection success depends on:

- **STUN**: Discovers public IP address (works for ~80% of NAT types)
- **TURN**: Relays media when direct P2P connection fails (remaining ~20%)

Without TURN, voice chat fails for users behind:
- Symmetric NAT
- Corporate firewalls
- Mobile carrier-grade NAT (CGNAT)
- Strict security policies blocking UDP

## Decision
We will require a **mandatory TURN server in production** deployments to guarantee voice chat connectivity for all users.

## Consequences

### Positive
- **100% connectivity**: Voice chat works for all NAT configurations
- **Better UX**: Predictable voice functionality, no "it works for some users" issues
- **Enterprise support**: Works in corporate networks with restrictive firewalls
- **Mobile support**: Reliable on cellular networks with CGNAT

### Negative
- **Infrastructure cost**: TURN server required (cannot use free STUN-only)
- **Bandwidth cost**: TURN relays ~20% of connections, consuming server bandwidth
- **Deployment complexity**: Additional service to configure, monitor, and maintain
- **Latency**: TURN relay adds 20-100ms latency vs direct P2P

### Risks
- **TURN server outage**: Voice chat completely fails if TURN server is down
- **Cost scaling**: Bandwidth costs grow linearly with user count
- **Resource exhaustion**: TURN server can become bottleneck under load

## Alternatives Considered

### Alternative 1: STUN-only (no TURN)
- **Pros**: Free, no infrastructure, minimal latency
- **Cons**: ~20% of users cannot connect to voice chat
- **Verdict**: Unacceptable UX, voice becomes unreliable feature

### Alternative 2: TURN optional (fallback)
- **Pros**: Cost savings for majority of users
- **Cons**: Same result as mandatory TURN (20% still need it)
- **Verdict**: No benefit over mandatory; TURN is required anyway

### Alternative 3: Third-party TURN service (Twilio, Xirsys)
- **Pros**: No infrastructure management, global edge network
- **Cons**: Expensive at scale (~$0.40/GB), vendor lock-in, usage-based billing
- **Verdict**: Acceptable for prototyping, too expensive for production scale

### Alternative 4: Self-hosted Coturn
- **Pros**: Open source, full control, flat infrastructure cost
- **Cons**: Requires DevOps expertise, manual scaling, monitoring overhead
- **Verdict**: **Selected** - Best balance of cost and reliability

## Implementation Details
- **TURN server**: Coturn (open source)
- **Deployment**: Dedicated instance or Kubernetes pod
- **Credentials**: Time-limited credentials generated per session (prevent abuse)
- **Regions**: Multi-region TURN for global latency optimization (future)
- **Monitoring**: Track TURN bandwidth usage, connection success rates

## Configuration
```javascript
{
  iceServers: [
    { urls: 'stun:stun.syncwatch.example:3478' },
    {
      urls: 'turn:turn.syncwatch.example:3478',
      username: '<time-limited-username>',
      credential: '<time-limited-credential>'
    }
  ]
}
```

## References
- [Coturn Documentation](https://github.com/coturn/coturn)
- [WebRTC NAT Traversal](https://webrtc.org/getting-started/turn-server)
- Technical Specification Section 6.2: Voice Infrastructure
- infrastructure/modules/turn/
- backend/src/modules/voice/routes.ts (TURN credentials endpoint)
