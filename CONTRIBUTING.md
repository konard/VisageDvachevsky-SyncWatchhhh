# Contributing to SyncWatch

Thank you for your interest in contributing to SyncWatch! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Code Style](#code-style)
5. [Testing](#testing)
6. [Commit Guidelines](#commit-guidelines)
7. [Pull Request Process](#pull-request-process)
8. [Project Structure](#project-structure)
9. [Architecture Decisions](#architecture-decisions)

---

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow:

- **Be respectful**: Treat everyone with respect and consideration
- **Be collaborative**: Work together to improve the project
- **Be inclusive**: Welcome contributors from all backgrounds
- **Be constructive**: Provide helpful feedback and criticism
- **Be patient**: Remember that we're all learning

Unacceptable behavior includes harassment, discrimination, trolling, or any form of disrespect.

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js 20+** installed
- **Docker & Docker Compose** for infrastructure services
- **Git** for version control
- A code editor (VS Code recommended)

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/SyncWatchhhh.git
   cd SyncWatchhhh
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/VisageDvachevsky/SyncWatchhhh.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Start infrastructure services**:
   ```bash
   docker compose -f docker-compose.dev.yml up db redis minio minio-init -d
   ```

6. **Setup database**:
   ```bash
   npm run db:migrate
   npm run db:generate
   ```

7. **Start development servers**:
   ```bash
   npm run dev
   ```

8. **Verify setup**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - MinIO Console: http://localhost:9001 (user: `minioadmin`, pass: `minioadmin`)

---

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes
- `chore/` - Maintenance tasks

### 2. Keep Your Branch Updated

Regularly sync with upstream:

```bash
git fetch upstream
git rebase upstream/main
```

### 3. Make Your Changes

- Write clean, readable code following our [Code Style](#code-style)
- Add tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 4. Test Your Changes

Before submitting, ensure all tests pass:

```bash
# Lint code
npm run lint

# Run tests
npm run test

# Build project
npm run build
```

Fix any linting errors or failing tests.

---

## Code Style

SyncWatch follows consistent code style across all workspaces. See [CODE_STYLE.md](CODE_STYLE.md) for detailed guidelines.

### Quick Summary

**TypeScript:**
- Use TypeScript for all new code
- Prefer interfaces over types for objects
- Use `const` over `let`, avoid `var`
- Enable strict mode

**Naming:**
- `camelCase` for variables and functions
- `PascalCase` for classes and components
- `UPPER_SNAKE_CASE` for constants
- Prefix unused variables with `_`

**Formatting:**
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Max line length: 100 characters

**Linting:**
```bash
# Auto-fix lint issues
npm run lint -- --fix

# Check specific workspace
npm run lint --workspace=backend
npm run lint --workspace=frontend
```

---

## Testing

### Writing Tests

**Backend (Vitest):**
```typescript
// backend/src/modules/auth/__tests__/auth.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../auth.service';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  it('should hash passwords correctly', async () => {
    const password = 'SecurePass123!';
    const hash = await authService.hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt format
  });
});
```

**Frontend (Vitest + React Testing Library):**
```typescript
// frontend/src/components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests for specific workspace
npm run test --workspace=backend
npm run test --workspace=frontend

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage
```

### Test Coverage

- Aim for **>80% coverage** for new code
- **Required** for critical paths (auth, sync, payments)
- **Recommended** for utilities and helpers

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear commit history.

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Scopes (optional):**
- `auth` - Authentication module
- `rooms` - Room management
- `sync` - Video synchronization
- `chat` - Text chat
- `voice` - WebRTC voice
- `ui` - Frontend UI
- `api` - Backend API
- `db` - Database changes
- `docs` - Documentation

### Examples

```bash
# Feature
feat(sync): add playback rate control

# Bug fix
fix(auth): prevent token expiry race condition

# Documentation
docs: update API documentation for rooms endpoint

# Refactor
refactor(voice): extract WebRTC connection logic

# Test
test(rooms): add integration tests for join flow
```

### Commit Message Best Practices

- Use imperative mood: "add feature" not "added feature"
- First line max 72 characters
- Capitalize first letter of subject
- No period at end of subject
- Add body for complex changes
- Reference issues: "Fixes #123" or "Closes #456"

---

## Pull Request Process

### Before Creating a PR

1. ✅ All tests pass locally
2. ✅ Code is linted and formatted
3. ✅ Branch is up-to-date with `main`
4. ✅ Commits follow conventional format
5. ✅ Documentation is updated
6. ✅ No console.log or debug code

### Creating a Pull Request

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub**:
   - Use a clear, descriptive title
   - Follow the PR template
   - Link related issues
   - Add screenshots/videos for UI changes
   - Request reviewers

### PR Title Format

Follow conventional commits:
```
feat(sync): add support for variable playback rate
fix(auth): resolve token refresh race condition
docs: update contributing guidelines
```

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Testing
Describe how you tested the changes

## Screenshots (if applicable)
Add screenshots or videos

## Checklist
- [ ] Tests pass
- [ ] Code is linted
- [ ] Documentation updated
- [ ] Commits follow conventions
```

### PR Review Process

1. **Automated checks** must pass (CI/CD)
2. **At least one approval** from maintainers
3. **Address feedback** promptly
4. **Keep PR updated** with main branch
5. **Squash or rebase** before merge (maintainer will decide)

### After PR is Merged

1. Delete your feature branch
2. Pull latest main:
   ```bash
   git checkout main
   git pull upstream main
   ```

---

## Project Structure

```
SyncWatch/
├── frontend/              # React SPA
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── stores/        # Zustand state stores
│   │   ├── services/      # API clients
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript types
│   └── public/            # Static assets
├── backend/               # Node.js API
│   ├── src/
│   │   ├── modules/       # Feature modules (auth, rooms, videos, etc.)
│   │   ├── websocket/     # Socket.io handlers
│   │   ├── common/        # Shared code (middleware, utils, errors)
│   │   ├── database/      # Database clients (Prisma, Redis)
│   │   └── config/        # Configuration
│   └── prisma/            # Database schema and migrations
├── transcoder/            # FFmpeg transcoding worker
├── shared/                # Shared types and utilities
├── docs/                  # Documentation
└── config/                # Docker and infrastructure configs
```

### Module Structure (Backend)

Each backend module follows this structure:

```
modules/auth/
├── auth.routes.ts         # Fastify routes
├── auth.service.ts        # Business logic
├── auth.schemas.ts        # Zod validation schemas
└── __tests__/             # Tests
    └── auth.service.test.ts
```

---

## Architecture Decisions

### When to Use What

**State Management (Frontend):**
- Zustand for global state (user, room, playback)
- React Context for theme/i18n
- useState for local component state

**API Calls:**
- Use services in `/frontend/src/services/`
- Add error handling
- Use React Query for caching (if needed)

**WebSocket Events:**
- Emit commands from user actions
- Listen for server broadcasts
- Handle reconnection automatically

**Database:**
- Prisma for PostgreSQL queries
- Redis for real-time state (rooms, sync)
- Use transactions for multi-step operations

**Error Handling:**
- Use custom error classes (`AppError`, `ValidationError`, etc.)
- Always return consistent error format
- Log errors with context

### Performance Guidelines

- **Frontend**: Code split routes, lazy load heavy components
- **Backend**: Use Redis for caching, implement rate limiting
- **Database**: Index frequently queried fields, use SELECT specific columns
- **WebSocket**: Debounce high-frequency events (seek commands)

### Security Guidelines

- **Never** commit secrets or API keys
- **Always** validate user input (Zod schemas)
- **Always** sanitize error messages (no stack traces to client)
- **Use** bcrypt for password hashing
- **Use** JWT with short expiry for access tokens
- **Implement** rate limiting on all endpoints

---

## Getting Help

### Documentation

- [README.md](README.md) - Quick start guide
- [docs/TECHNICAL_SPECIFICATION.md](docs/TECHNICAL_SPECIFICATION.md) - Full technical spec
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture
- [docs/API.md](docs/API.md) - API documentation
- [docs/WEBSOCKET.md](docs/WEBSOCKET.md) - WebSocket events
- [CODE_STYLE.md](CODE_STYLE.md) - Code style guide

### Communication

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Pull Requests**: Code review and feedback

### Common Issues

**Database connection errors:**
```bash
# Restart database
docker compose -f docker-compose.dev.yml restart db

# Re-run migrations
npm run db:migrate
```

**Port already in use:**
```bash
# Find and kill process on port 4000
lsof -ti:4000 | xargs kill -9
```

**Node modules issues:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## License

By contributing to SyncWatch, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to SyncWatch! 🎉
