/**
 * Sentry initialization and configuration
 * Handles error tracking setup with privacy controls
 */

import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error tracking
 */
export function initializeSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const enabled = import.meta.env.VITE_ERROR_TRACKING_ENABLED === 'true';
  const environment = import.meta.env.VITE_ENVIRONMENT || 'development';

  // Don't initialize if not enabled or no DSN
  if (!enabled || !dsn) {
    console.log('[Sentry] Error tracking disabled');
    return;
  }

  // Check if user has Do Not Track enabled
  const doNotTrack =
    navigator.doNotTrack === '1' ||
    (window as any).doNotTrack === '1' ||
    (navigator as any).msDoNotTrack === '1';

  if (doNotTrack) {
    console.log('[Sentry] Error tracking disabled due to Do Not Track preference');
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Set to 1.0 (100%) for now, adjust based on traffic
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Sample rate for session replays
    replaysSessionSampleRate: 0.0, // Disabled by default for privacy

    // Sample rate for replays on error
    replaysOnErrorSampleRate: environment === 'production' ? 0.1 : 0.0,

    // Integrations
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration(),

      // Replay integration (optional, disabled by default)
      // Sentry.replayIntegration({
      //   maskAllText: true,
      //   blockAllMedia: true,
      // }),
    ],

    // Before send hook to scrub sensitive data
    beforeSend(event) {
      // Don't send events in development unless explicitly enabled
      if (environment === 'development' && !import.meta.env.VITE_SENTRY_DEBUG) {
        return null;
      }

      // Scrub sensitive data from request bodies
      if (event.request) {
        if (event.request.data) {
          event.request.data = scrubData(event.request.data);
        }
        if (event.request.headers) {
          // Remove authorization headers
          delete event.request.headers.Authorization;
          delete event.request.headers.Cookie;
        }
      }

      // Scrub sensitive data from extra context
      if (event.extra) {
        event.extra = scrubData(event.extra);
      }

      return event;
    },

    // Before breadcrumb hook to filter and scrub
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }

      // Scrub sensitive data from breadcrumb data
      if (breadcrumb.data) {
        breadcrumb.data = scrubData(breadcrumb.data);
      }

      return breadcrumb;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser extension errors
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      // Network errors that are expected
      'NetworkError',
      'Network request failed',
      // User cancelled operations
      'AbortError',
      'User aborted',
      // ResizeObserver errors (common and harmless)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],

    // Deny URLs (don't track errors from these sources)
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });

  console.log('[Sentry] Error tracking initialized');
}

/**
 * Scrub sensitive data from objects
 */
function scrubData(data: any): any {
  if (!data) return data;

  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'secret',
    'authorization',
    'cookie',
    'session',
    'sessionId',
    'session_id',
    'ssn',
    'social_security',
    'creditCard',
    'credit_card',
    'cardNumber',
    'card_number',
    'cvv',
    'pin',
  ];

  const scrubObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
      return obj.map(scrubObject);
    }

    if (typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = scrubObject(value);
        }
      }
      return result;
    }

    return obj;
  };

  return scrubObject(data);
}
