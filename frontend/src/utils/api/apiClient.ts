import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getErrorMessage } from './errorHandler';

/**
 * Create configured axios instance with error handling
 */
export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      // Add auth token if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Log request in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
      }

      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log response in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`API Response: ${response.config.url}`, response.data);
      }

      return response;
    },
    (error: AxiosError) => {
      // Log error in development
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', error.config?.url, error.response?.data || error.message);
      }

      // Handle specific error cases
      if (error.response) {
        const { status } = error.response;

        // Unauthorized - clear auth and redirect to login
        if (status === 401) {
          localStorage.removeItem('auth_token');
          // Optionally redirect to login
          // window.location.href = '/login';
        }

        // Forbidden - show error
        if (status === 403) {
          console.warn('Access forbidden:', error.response.data);
        }
      }

      // Network error
      if (!error.response) {
        console.error('Network error:', error.message);
      }

      return Promise.reject(error);
    }
  );

  return client;
}

// Default API client instance
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const apiClient = createApiClient(API_BASE_URL);
