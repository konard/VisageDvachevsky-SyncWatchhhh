# ADR-0005: Monorepo Structure

## Status
Accepted

## Context
SyncWatch consists of multiple TypeScript packages that share types, utilities, and domain logic:
- Frontend (React SPA)
- Backend (Fastify API + WebSocket)
- Transcoder (FFmpeg worker service)
- Shared types and utilities

The codebase organization must:
- Enable code sharing between packages
- Maintain clear boundaries between modules
- Support independent deployment of services
- Simplify development workflow
- Ensure type safety across the stack

## Decision
We will use an **npm workspaces monorepo** structure with separate packages for frontend, backend, transcoder, and shared code.

## Consequences

### Positive
- **Type safety**: Shared TypeScript interfaces guarantee client-server contract
- **Code reuse**: Common utilities, validation schemas, and constants in one place
- **Atomic changes**: Cross-package changes in single commit/PR
- **Single install**: One `npm install` for entire project
- **Simplified CI**: Single test/lint/build pipeline
- **Versioning**: All packages versioned together, avoiding compatibility issues

### Negative
- **Build complexity**: Must build shared package before others
- **Tight coupling**: Harder to split into separate repos later
- **Large repository**: Clone time and disk usage higher
- **Dependency conflicts**: All packages must agree on shared dependency versions

### Risks
- **Accidental coupling**: Easy to create inappropriate dependencies between packages
- **Slow CI**: All packages tested on every change (can optimize with affected detection)

## Structure
```
/
├── package.json (workspace root)
├── frontend/
│   ├── package.json
│   └── src/
├── backend/
│   ├── package.json
│   └── src/
├── transcoder/
│   ├── package.json
│   └── src/
└── shared/
    ├── package.json
    └── src/
        ├── types/
        ├── constants/
        └── utils/
```

## Alternatives Considered

### Alternative 1: Separate repositories (polyrepo)
- **Pros**: Independent deployment, clear boundaries, smaller clones
- **Cons**: Type mismatches, duplicate code, harder to refactor across packages
- **Verdict**: Too much overhead for tightly coupled frontend/backend

### Alternative 2: Single package (monolith)
- **Pros**: Simplest structure, no build orchestration
- **Cons**: Cannot deploy services independently, poor separation of concerns
- **Verdict**: Blocks independent scaling of backend vs transcoder

### Alternative 3: Lerna/Nx/Turborepo
- **Pros**: Advanced features (affected detection, caching, task orchestration)
- **Cons**: Additional complexity, dependency on third-party tool
- **Verdict**: Native npm workspaces sufficient for current scale

## Development Workflow
1. Install: `npm install` (installs all workspaces)
2. Build shared: `npm run build --workspace=shared`
3. Type check: `npm run typecheck` (checks all packages)
4. Run dev: `npm run dev` (runs frontend + backend concurrently)

## References
- [npm Workspaces Documentation](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
- package.json (root)
- shared/src/index.ts
