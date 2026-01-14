# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) documenting significant architectural and technical decisions made for the SyncWatch project.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences. ADRs help:

- **Preserve context**: Explain why decisions were made, not just what was decided
- **Onboard new developers**: Understand the reasoning behind current architecture
- **Prevent revisiting**: Avoid re-debating settled decisions
- **Track evolution**: Document how architecture changes over time
- **Enable learning**: Learn from both successes and mistakes

## ADR Format

Each ADR follows this structure:
- **Status**: Proposed, Accepted, Deprecated, or Superseded
- **Context**: The issue or situation motivating the decision
- **Decision**: The change or choice being made
- **Consequences**: Positive and negative outcomes, risks
- **Alternatives Considered**: Other options and why they were rejected
- **References**: Links to related documentation, code, or issues

## Index of ADRs

### Core Architecture

- [ADR-0001: Socket.io for Real-time Communication](./ADR-0001-socketio-for-realtime.md)
  - *Status*: Accepted
  - *Summary*: Use Socket.io for bidirectional real-time messaging between clients and server

- [ADR-0004: Redis for State and Pub/Sub](./ADR-0004-redis-state-pubsub.md)
  - *Status*: Accepted
  - *Summary*: Use Redis for shared state management and cross-server pub/sub

- [ADR-0005: Monorepo Structure](./ADR-0005-monorepo-structure.md)
  - *Status*: Accepted
  - *Summary*: Organize codebase as npm workspaces monorepo with shared types

### Video & Voice

- [ADR-0002: P2P Mesh for Voice Chat MVP](./ADR-0002-p2p-mesh-voice-mvp.md)
  - *Status*: Accepted
  - *Summary*: Implement voice chat using WebRTC P2P mesh topology for up to 5 participants

- [ADR-0003: HLS for Video Delivery](./ADR-0003-hls-video-delivery.md)
  - *Status*: Accepted
  - *Summary*: Use HLS with H.264 for adaptive bitrate video streaming

- [ADR-0006: TURN Mandatory for Production](./ADR-0006-turn-mandatory-production.md)
  - *Status*: Accepted
  - *Summary*: Require self-hosted TURN server for reliable voice connectivity

### Protocols & Compatibility

- [ADR-0007: Sync Protocol Versioning](./ADR-0007-sync-protocol-versioning.md)
  - *Status*: Accepted
  - *Summary*: Version the sync protocol to support backward compatibility and gradual rollout

## Creating a New ADR

1. Copy the [ADR template](./ADR-TEMPLATE.md)
2. Number it sequentially (next available number)
3. Write a short, descriptive title (e.g., `ADR-0008-graphql-api.md`)
4. Fill in all sections with context, decision, and consequences
5. Submit for review in a pull request
6. Update this index when the ADR is accepted

## ADR Lifecycle

```
Proposed → Accepted → (Optional: Deprecated or Superseded)
```

- **Proposed**: Under discussion, not yet implemented
- **Accepted**: Approved and implemented
- **Deprecated**: No longer recommended, but not yet replaced
- **Superseded**: Replaced by a newer ADR (link to successor)

## Guidelines

- **One decision per ADR**: Keep scope focused
- **Explain the "why"**: Context and reasoning matter more than the decision itself
- **List alternatives**: Show you considered other options
- **Be honest about tradeoffs**: No decision is perfect; document the downsides
- **Keep it concise**: 1-2 pages maximum; link to detailed docs if needed
- **Update when invalidated**: Mark as deprecated/superseded rather than deleting

## References

- [Documenting Architecture Decisions (Michael Nygard)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization](https://adr.github.io/)
