import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get access token from storage
 * Checks both localStorage and sessionStorage
 */
function getAccessToken(): string | null {
  return (
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('accessToken')
  );
}

/**
 * Get refresh token from storage
 * Checks both localStorage and sessionStorage
 */
function getRefreshToken(): string | null {
  return (
    localStorage.getItem('refreshToken') ||
    sessionStorage.getItem('refreshToken')
  );
}

/**
 * Update access token in storage
 * Updates in the same storage that currently has the refresh token
 */
function updateAccessToken(newToken: string): void {
  if (localStorage.getItem('refreshToken')) {
    localStorage.setItem('accessToken', newToken);
  } else if (sessionStorage.getItem('refreshToken')) {
    sessionStorage.setItem('accessToken', newToken);
  }
}

/**
 * Clear all tokens from storage
 */
function clearAllTokens(): void {
  ['accessToken', 'refreshToken', 'rememberMe'].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Subscribe to token refresh completion
 */
function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers when token is refreshed
 */
function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 errors with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Check if error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry refresh endpoint to avoid infinite loop
      if (originalRequest.url?.includes('/auth/refresh')) {
        clearAllTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // If already refreshing, wait for it to complete
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh endpoint
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update stored tokens
        updateAccessToken(accessToken);
        if (newRefreshToken) {
          const rememberMe = localStorage.getItem('rememberMe') === 'true';
          const storage = rememberMe ? localStorage : sessionStorage;
          storage.setItem('refreshToken', newRefreshToken);
        }

        // Update authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Notify all waiting requests
        onTokenRefreshed(accessToken);

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        clearAllTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
