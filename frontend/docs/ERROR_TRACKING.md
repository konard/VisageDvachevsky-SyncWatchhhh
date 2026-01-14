# Error Tracking Documentation

This document describes the error tracking implementation in SyncWatch.

## Overview

SyncWatch uses [Sentry](https://sentry.io) for remote error tracking and monitoring. The implementation includes:

- Automatic error capture via ErrorBoundary
- Manual error logging via errorLogger utility
- Privacy controls and data scrubbing
- Source map upload for TypeScript stack traces
- User and room context tracking
- Breadcrumb trail for debugging

## Configuration

### Environment Variables

#### Runtime Configuration (Required for error tracking)

Add these to your `.env` file:

```bash
# Sentry DSN from your Sentry project
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Enable/disable error tracking
VITE_ERROR_TRACKING_ENABLED=true

# Environment name (development, staging, production)
VITE_ENVIRONMENT=production

# Debug mode (optional, for testing in development)
VITE_SENTRY_DEBUG=false
```

#### Build-time Configuration (Optional, for CI/CD)

These are only needed for uploading source maps during production builds:

```bash
SENTRY_ORG=your-sentry-organization
SENTRY_PROJECT=syncwatch-frontend
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

### Privacy Controls

The implementation respects user privacy:

1. **Do Not Track**: Error tracking is automatically disabled if the user has DNT enabled
2. **Opt-out**: Users can disable tracking via `VITE_ERROR_TRACKING_ENABLED=false`
3. **Data Scrubbing**: Sensitive data is automatically removed from error reports

### Sensitive Data

The following fields are automatically scrubbed from error reports:

- password
- token, apiKey, api_key
- accessToken, access_token
- refreshToken, refresh_token
- secret, authorization
- cookie, session, sessionId, session_id
- ssn, social_security
- creditCard, credit_card, cardNumber, card_number
- cvv, pin

## Usage

### Automatic Error Capture

All uncaught React errors are automatically captured by the ErrorBoundary:

```tsx
// Already set up in App.tsx
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Manual Error Logging

Use the `errorLogger` utility for manual logging:

```typescript
import { errorLogger } from '@/utils/logger/errorLogger';

// Error logging
try {
  // Your code
} catch (error) {
  errorLogger.error('Failed to load data', error, 'DataService', {
    endpoint: '/api/data',
    userId: currentUser.id,
  });
}

// Warning logging
errorLogger.warn('Slow network detected', 'NetworkMonitor', {
  latency: 3000,
});

// Info logging
errorLogger.info('User joined room', 'RoomService', {
  roomId: 'room-123',
  userId: 'user-456',
});
```

### Setting User Context

Set user context when the user logs in:

```typescript
import { errorLogger } from '@/utils/logger/errorLogger';

// On login
errorLogger.setUserContext(user.id, user.email);

// On logout
errorLogger.setUserContext(null);
```

### Setting Room Context

Set room context when the user joins a room:

```typescript
import { errorLogger } from '@/utils/logger/errorLogger';

// On room join
errorLogger.setRoomContext(roomId);

// On room leave
errorLogger.setRoomContext(null);
```

### Adding Breadcrumbs

Add breadcrumbs to track user actions leading to an error:

```typescript
import { errorLogger } from '@/utils/logger/errorLogger';

// Track user actions
errorLogger.addBreadcrumb('User clicked play button', 'ui.click', {
  videoId: 'video-123',
  timestamp: Date.now(),
});

errorLogger.addBreadcrumb('Video playback started', 'video.play', {
  currentTime: 0,
});
```

## Error Levels

The error logger supports four levels:

1. **DEBUG**: Development debugging information (not sent to Sentry)
2. **INFO**: Informational messages (not sent to Sentry)
3. **WARN**: Warnings about degraded functionality (sent to Sentry)
4. **ERROR**: Errors requiring attention (sent to Sentry)

## Source Maps

Source maps are automatically generated during builds and can be uploaded to Sentry:

1. **Local development**: Source maps are generated but not uploaded
2. **Production builds**: Set `SENTRY_AUTH_TOKEN` to enable automatic upload

### Manual Source Map Upload

If needed, you can manually upload source maps:

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Configure Sentry CLI
export SENTRY_AUTH_TOKEN=your-auth-token
export SENTRY_ORG=your-org
export SENTRY_PROJECT=syncwatch-frontend

# Upload source maps
sentry-cli sourcemaps upload --release=your-release-version ./dist
```

## Testing

Test the error logging implementation:

```bash
# Run the test script
npx tsx experiments/test-error-logging.ts
```

This will test:
- Basic logging methods
- User and room context setting
- Breadcrumb addition
- Data scrubbing
- Log retrieval and export

## Monitoring

### Sentry Dashboard

Access your Sentry dashboard at https://sentry.io to:

- View error reports with full stack traces
- See user and room context
- Review breadcrumb trails
- Monitor error rates and trends
- Set up alerting rules

### Key Metrics

Monitor these metrics:

- Error rate (errors per user session)
- Error types and groupings
- Browser and OS distribution
- User impact (affected users)
- Performance issues

## Troubleshooting

### Errors not appearing in Sentry

1. Check that `VITE_ERROR_TRACKING_ENABLED=true`
2. Verify `VITE_SENTRY_DSN` is set correctly
3. Check browser console for Sentry initialization message
4. Ensure user doesn't have Do Not Track enabled
5. Check that environment is not 'development' (unless `VITE_SENTRY_DEBUG=true`)

### Source maps not working

1. Verify source maps are enabled in `vite.config.ts`
2. Check that `SENTRY_AUTH_TOKEN` is set during build
3. Ensure the release version matches between app and uploaded source maps
4. Check Sentry project settings for source map configuration

### Too many events

Adjust sample rates in `src/utils/sentry.ts`:

```typescript
// Reduce sampling for high-traffic sites
tracesSampleRate: 0.1, // 10% of transactions
replaysOnErrorSampleRate: 0.1, // 10% of errors
```

## Best Practices

1. **Context is key**: Always set user and room context for better debugging
2. **Add breadcrumbs**: Track important user actions before errors
3. **Use appropriate levels**: Don't send DEBUG/INFO to Sentry to reduce noise
4. **Scrub sensitive data**: The system does this automatically, but be mindful
5. **Test locally**: Use `VITE_SENTRY_DEBUG=true` to test in development
6. **Monitor regularly**: Check Sentry dashboard for new error patterns
7. **Set up alerts**: Configure Sentry alerts for critical errors

## Security

- All sensitive data is automatically scrubbed before sending to Sentry
- Authorization headers and cookies are removed from requests
- User privacy is respected via Do Not Track
- Source maps are uploaded securely via authenticated API
- GDPR compliant with user opt-out capability

## Related Files

- `frontend/src/utils/logger/errorLogger.ts` - Main error logger utility
- `frontend/src/utils/sentry.ts` - Sentry initialization and configuration
- `frontend/src/components/error/ErrorBoundary.tsx` - React error boundary
- `frontend/src/main.tsx` - App initialization with Sentry setup
- `frontend/vite.config.ts` - Build configuration with source maps
- `frontend/.env.example` - Environment variable template
