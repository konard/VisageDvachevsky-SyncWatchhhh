# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Updated vite from 5.0.12 to 7.3.1 to address CVE-2024-67MH (moderate severity esbuild vulnerability)
- Updated @fastify/jwt from 8.0.0 to 10.0.0 to address CVE-2024-GM45 (moderate severity fast-jwt vulnerability)
- Updated vitest to latest version across all workspaces
- All npm audit vulnerabilities resolved (0 vulnerabilities remaining)

### Added
- CI/CD pipeline with GitHub Actions
- Automated linting, type checking, and testing
- Integration tests with PostgreSQL and Redis
- Security auditing with npm audit and Snyk
- Docker multi-stage builds for production
- Automated deployment workflows for staging and production
- Semantic versioning and automated release process
- Docker images pushed to GitHub Container Registry

### Changed
- Enhanced package.json scripts for CI/CD compatibility
- Improved build process with optimized Docker images

### Fixed
- Fixed JSX syntax error in ProfilePage.tsx

### Infrastructure
- Production-ready Dockerfiles for backend, frontend, and transcoder
- Nginx configuration for frontend with security headers
- Health checks for all services
- Multi-stage Docker builds for smaller image sizes

## [0.1.0] - Initial Development

### Added
- Room management system
- Video synchronization protocol
- Text chat functionality
- Voice chat with WebRTC
- User authentication and authorization
- Friend system
- Video upload with transcoding
- YouTube embed support
- PostgreSQL database with Prisma ORM
- Redis for real-time features
- MinIO for object storage
- React frontend with Vite
- Fastify backend with TypeScript
- BullMQ job queue for video transcoding
- Modern "liquid glass" UI design

[Unreleased]: https://github.com/VisageDvachevsky/SyncWatchhhh/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/VisageDvachevsky/SyncWatchhhh/releases/tag/v0.1.0
