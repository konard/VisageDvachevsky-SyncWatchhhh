import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  statusCode?: number;
  errorCode?: string;
  details?: any;
}

/**
 * Extract user-friendly error message from API error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    // Network error (no response)
    if (!error.response) {
      if (error.code === 'ERR_NETWORK') {
        return 'Network error. Please check your internet connection.';
      }
      if (error.code === 'ECONNABORTED') {
        return 'Request timeout. Please try again.';
      }
      return 'Unable to connect to server. Please try again later.';
    }

    // HTTP error response
    const { status, data } = error.response;

    // Custom error message from server
    if (data?.message) {
      return data.message;
    }

    // Standard HTTP error messages
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Please log in to continue';
      case 403:
        return 'You do not have permission to perform this action';
      case 404:
        return 'The requested resource was not found';
      case 409:
        return 'Conflict: The resource already exists';
      case 422:
        return 'Validation error. Please check your input.';
      case 429:
        return 'Too many requests. Please wait and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return `Request failed with status ${status}`;
    }
  }

  // Generic error
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Parse API error into structured format
 */
export function parseApiError(error: unknown): ApiError {
  if (error instanceof AxiosError && error.response) {
    return {
      message: getErrorMessage(error),
      statusCode: error.response.status,
      errorCode: error.response.data?.code,
      details: error.response.data?.details,
    };
  }

  return {
    message: getErrorMessage(error),
  };
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof AxiosError && !error.response;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 401;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  return error instanceof AxiosError &&
    (error.response?.status === 400 || error.response?.status === 422);
}
