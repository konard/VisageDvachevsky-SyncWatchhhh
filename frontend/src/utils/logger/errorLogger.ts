/**
 * Error logging utility
 * Provides centralized error logging with optional remote tracking
 */

import * as Sentry from '@sentry/react';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  error?: Error;
  metadata?: Record<string, any>;
}

export interface ErrorContext {
  userId?: string;
  roomId?: string;
  userAgent?: string;
  url?: string;
  componentStack?: string;
}

class ErrorLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 100;
  private enabled: boolean = true;
  private remoteLoggingEnabled: boolean = false;
  private errorContext: ErrorContext = {};

  constructor() {
    // Enable logging in development by default
    this.enabled = process.env.NODE_ENV === 'development';

    // Check if remote logging is enabled via environment variable
    this.remoteLoggingEnabled =
      import.meta.env.VITE_ERROR_TRACKING_ENABLED === 'true' &&
      !!import.meta.env.VITE_SENTRY_DSN;
  }

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set user context for error tracking
   */
  setUserContext(userId: string | null, userEmail?: string): void {
    if (userId) {
      this.errorContext.userId = userId;
      if (this.remoteLoggingEnabled) {
        Sentry.setUser({
          id: userId,
          email: userEmail,
        });
      }
    } else {
      this.errorContext.userId = undefined;
      if (this.remoteLoggingEnabled) {
        Sentry.setUser(null);
      }
    }
  }

  /**
   * Set room context for error tracking
   */
  setRoomContext(roomId: string | null): void {
    this.errorContext.roomId = roomId ?? undefined;
    if (this.remoteLoggingEnabled && roomId) {
      Sentry.setTag('roomId', roomId);
    }
  }

  /**
   * Add breadcrumb for user action tracking
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    if (this.remoteLoggingEnabled) {
      Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
        timestamp: Date.now() / 1000,
      });
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, undefined, metadata);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, undefined, metadata);
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, undefined, metadata);
  }

  /**
   * Log an error
   */
  error(message: string, error?: Error, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error, metadata);
  }

  /**
   * Internal logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    error?: Error,
    metadata?: Record<string, any>
  ): void {
    if (!this.enabled) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
      metadata,
    };

    // Add to in-memory logs
    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console logging
    this.logToConsole(entry);

    // Send to remote logging service
    if (this.remoteLoggingEnabled) {
      this.logToRemote(entry);
    }
  }

  /**
   * Log to browser console
   */
  private logToConsole(entry: LogEntry): void {
    const { level, message, context, error, metadata } = entry;
    const prefix = context ? `[${context}]` : '';
    const fullMessage = `${prefix} ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(fullMessage, metadata);
        break;
      case LogLevel.INFO:
        console.info(fullMessage, metadata);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, metadata);
        break;
      case LogLevel.ERROR:
        console.error(fullMessage, error, metadata);
        break;
    }
  }

  /**
   * Log to remote service (Sentry)
   */
  private logToRemote(entry: LogEntry): void {
    const { level, message, context, error, metadata } = entry;

    // Scrub sensitive data from metadata
    const scrubbedMetadata = this.scrubSensitiveData(metadata);

    // Map LogLevel to Sentry severity
    const sentryLevel = this.mapLogLevelToSentry(level);

    // Prepare tags
    const tags: Record<string, string> = {
      ...(context ? { context } : {}),
      ...(this.errorContext.roomId ? { roomId: this.errorContext.roomId } : {}),
    };

    if (level === LogLevel.ERROR) {
      // For errors, capture as exception
      if (error) {
        Sentry.captureException(error, {
          level: sentryLevel,
          tags,
          extra: scrubbedMetadata,
        });
      } else {
        // Create synthetic error for stack trace
        Sentry.captureException(new Error(message), {
          level: sentryLevel,
          tags,
          extra: scrubbedMetadata,
        });
      }
    } else if (level === LogLevel.WARN) {
      // For warnings, capture as message
      Sentry.captureMessage(message, {
        level: sentryLevel,
        tags,
        extra: scrubbedMetadata,
      });
    }
    // Skip DEBUG and INFO for remote logging to reduce noise
  }

  /**
   * Map LogLevel to Sentry severity level
   */
  private mapLogLevelToSentry(level: LogLevel): Sentry.SeverityLevel {
    switch (level) {
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warning';
      case LogLevel.ERROR:
        return 'error';
      default:
        return 'info';
    }
  }

  /**
   * Scrub sensitive data from metadata
   */
  private scrubSensitiveData(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

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
    ];

    const scrubbed = { ...metadata };

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

    return scrubObject(scrubbed);
  }

  /**
   * Get all logged entries
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter((log) => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Download logs as a file
   */
  downloadLogs(): void {
    const blob = new Blob([this.exportLogs()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `syncwatch-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();
