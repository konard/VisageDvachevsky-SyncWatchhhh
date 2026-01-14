# ADR-0002: P2P Mesh for Voice Chat MVP

## Status
Accepted

## Context
SyncWatch needs voice chat functionality for up to 5 participants to communicate during synchronized video watching. The voice system must:

- Support low-latency audio streaming
- Work across different networks and NAT configurations
- Be simple enough for MVP with small user groups
- Minimize server infrastructure costs
- Provide acceptable quality for casual conversations

## Decision
We will implement a **peer-to-peer (P2P) mesh topology** using WebRTC for voice chat in the MVP, where each participant connects directly to every other participant.

## Consequences

### Positive
- **Low latency**: Direct peer connections minimize audio delay
- **Low server cost**: Audio doesn't transit through the server (except TURN fallback)
- **Simple architecture**: No need for SFU (Selective Forwarding Unit) or MCU (Multipoint Control Unit)
- **Browser native**: WebRTC is built into all modern browsers
- **NAT traversal**: STUN/TURN handles firewall and NAT issues

### Negative
- **Bandwidth scaling**: Each participant uploads audio to N-1 peers (O(N²) connections)
- **CPU scaling**: Each participant encodes/decodes N-1 audio streams
- **Mesh limit**: Performance degrades significantly beyond 5-6 participants
- **Mobile limitations**: Battery drain and bandwidth consumption on mobile devices

### Risks
- **Connection failures**: If one peer has poor connectivity, their experience is degraded
- **Future migration**: Moving to SFU architecture later requires significant refactoring
- **TURN costs**: Fallback to TURN relay can be expensive at scale

## Alternatives Considered

### Alternative 1: SFU (Selective Forwarding Unit)
- **Pros**: Scales to 50+ participants, lower client bandwidth/CPU, server controls quality
- **Cons**: Requires dedicated media server (Janus, Mediasoup), higher infrastructure cost, increased complexity
- **Verdict**: Over-engineered for 5-person rooms; defer to v2

### Alternative 2: MCU (Multipoint Control Unit)
- **Pros**: Lowest client bandwidth/CPU (one stream in/out), best for weak devices
- **Cons**: Highest server cost (mixing N streams), introduces latency, complex deployment
- **Verdict**: Too expensive for MVP use case

### Alternative 3: Server-mediated audio (traditional VoIP)
- **Pros**: Simple server logic, predictable costs
- **Cons**: All audio transits server, higher latency, requires codec management
- **Verdict**: Higher latency than P2P, not ideal for real-time sync

## Migration Path
When scaling beyond 5 participants or supporting mobile-first users:
1. Introduce SFU architecture (e.g., Mediasoup)
2. Keep P2P as fallback for small rooms (<5 users)
3. Server auto-selects topology based on room size

## References
- [WebRTC Peer Connection API](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)
- [Simple-peer library](https://github.com/feross/simple-peer)
- Technical Specification Section 6: Voice Chat Implementation
- frontend/src/services/voice.service.ts
- backend/src/websocket/handlers/voice.handler.ts
