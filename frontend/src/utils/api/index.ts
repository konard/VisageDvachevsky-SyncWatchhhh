/**
 * API utilities exports
 */

export { apiClient, createApiClient } from './apiClient';
export {
  getErrorMessage,
  parseApiError,
  isNetworkError,
  isAuthError,
  isValidationError,
} from './errorHandler';
export type { ApiError } from './errorHandler';
