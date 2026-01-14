/**
 * Error logging utility
 * Provides centralized error logging with optional remote tracking
 */

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

class ErrorLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 100;
  private enabled: boolean = true;

  constructor() {
    // Enable logging in development by default
    this.enabled = process.env.NODE_ENV === 'development';
  }

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
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

    // TODO: Send to remote logging service (e.g., Sentry)
    // this.logToRemote(entry);
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
   * Log to remote service (placeholder for future implementation)
   *
   * TODO: Implement remote logging (e.g., Sentry, LogRocket)
   * This would send errors to a tracking service for production monitoring
   *
   * Example implementation:
   * ```
   * private logToRemote(entry: LogEntry): void {
   *   if (entry.level === LogLevel.ERROR && window.Sentry) {
   *     window.Sentry.captureException(entry.error || new Error(entry.message), {
   *       level: 'error',
   *       tags: {
   *         context: entry.context,
   *       },
   *       extra: entry.metadata,
   *     });
   *   }
   * }
   * ```
   */

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
