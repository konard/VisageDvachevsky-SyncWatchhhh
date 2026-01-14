import React from 'react';
import { GlassCard, GlassButton } from '../ui/glass';

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onReset?: () => void;
}

/**
 * Error Fallback UI Component
 * Displays when an error is caught by ErrorBoundary
 */
export function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <GlassCard className="max-w-2xl w-full p-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">😵</div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-300">
            We encountered an unexpected error. Don't worry, your data is safe.
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <details className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <summary className="cursor-pointer text-red-400 font-semibold mb-2">
                Error Details
              </summary>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Message:</p>
                  <pre className="text-red-300 text-sm overflow-x-auto whitespace-pre-wrap">
                    {error.message}
                  </pre>
                </div>
                {error.stack && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Stack Trace:</p>
                    <pre className="text-red-300 text-xs overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Component Stack:</p>
                    <pre className="text-red-300 text-xs overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onReset && (
            <GlassButton onClick={onReset} variant="primary">
              Try Again
            </GlassButton>
          )}
          <GlassButton onClick={handleGoHome} variant="secondary">
            Go to Home
          </GlassButton>
          <GlassButton onClick={handleReload} variant="secondary">
            Reload Page
          </GlassButton>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            If this problem persists, please contact support or report an issue.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
