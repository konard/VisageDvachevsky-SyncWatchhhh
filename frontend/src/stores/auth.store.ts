import { create } from 'zustand';
import { authService, type User, type LoginRequest, type RegisterRequest } from '../services/auth.service';

/**
 * Token storage keys
 */
const TOKEN_STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  REMEMBER_ME: 'rememberMe',
} as const;

/**
 * Auth store state
 */
interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Actions
  login: (data: LoginRequest, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  getCurrentUser: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

/**
 * Get stored tokens from localStorage or sessionStorage
 */
function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  // Check if "Remember me" was selected (stored in localStorage)
  const rememberMe = localStorage.getItem(TOKEN_STORAGE_KEYS.REMEMBER_ME) === 'true';

  // Use localStorage if rememberMe, otherwise sessionStorage
  const storage = rememberMe ? localStorage : sessionStorage;

  return {
    accessToken: storage.getItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN),
    refreshToken: storage.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN),
  };
}

/**
 * Store tokens in localStorage or sessionStorage
 */
function storeTokens(
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean = false
): void {
  // Store rememberMe preference in localStorage
  localStorage.setItem(TOKEN_STORAGE_KEYS.REMEMBER_ME, String(rememberMe));

  // Use localStorage if rememberMe, otherwise sessionStorage
  const storage = rememberMe ? localStorage : sessionStorage;

  storage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  storage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
}

/**
 * Clear all stored tokens
 */
function clearStoredTokens(): void {
  // Clear from both storages to be safe
  [localStorage, sessionStorage].forEach((storage) => {
    storage.removeItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
    storage.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
  });
  localStorage.removeItem(TOKEN_STORAGE_KEYS.REMEMBER_ME);
}

/**
 * Auth store
 * Manages authentication state and provides auth-related actions
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,

  /**
   * Initialize auth state from stored tokens
   * Should be called once on app startup
   */
  initialize: async () => {
    try {
      const { accessToken, refreshToken } = getStoredTokens();

      if (!accessToken || !refreshToken) {
        set({ isInitialized: true });
        return;
      }

      // Set tokens in state
      set({ accessToken, refreshToken });

      // Try to get current user
      try {
        const user = await authService.getCurrentUser();
        set({
          user,
          isAuthenticated: true,
          isInitialized: true,
        });
      } catch (error) {
        // Token might be expired, try to refresh
        const refreshed = await get().refreshTokens();
        if (refreshed) {
          const user = await authService.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isInitialized: true,
          });
        } else {
          // Refresh failed, clear everything
          clearStoredTokens();
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isInitialized: true,
          });
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      clearStoredTokens();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  },

  /**
   * Login with email and password
   */
  login: async (data: LoginRequest, rememberMe: boolean = false) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.login(data);

      // Store tokens
      storeTokens(response.accessToken, response.refreshToken, rememberMe);

      // Update state
      set({
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Invalid email or password. Please try again.';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Register a new user
   */
  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.register(data);

      // Auto-login after registration (always remember for registered users)
      storeTokens(response.accessToken, response.refreshToken, true);

      // Update state
      set({
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Logout current user
   */
  logout: async () => {
    const { refreshToken } = get();

    try {
      // Revoke refresh token on server (don't wait for response)
      if (refreshToken) {
        authService.logout(refreshToken).catch((err) => {
          console.error('Failed to revoke refresh token:', err);
        });
      }
    } finally {
      // Clear tokens from storage
      clearStoredTokens();

      // Reset state
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  /**
   * Refresh access token using refresh token
   * Returns true if successful, false otherwise
   */
  refreshTokens: async (): Promise<boolean> => {
    const { refreshToken } = get();

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await authService.refreshAccessToken(refreshToken);

      // Get rememberMe preference
      const rememberMe = localStorage.getItem(TOKEN_STORAGE_KEYS.REMEMBER_ME) === 'true';

      // Store new tokens (refresh token might be rotated)
      const newRefreshToken = response.refreshToken || refreshToken;
      storeTokens(response.accessToken, newRefreshToken, rememberMe);

      // Update state
      set({
        accessToken: response.accessToken,
        refreshToken: newRefreshToken,
      });

      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);

      // Clear tokens and reset state
      clearStoredTokens();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });

      return false;
    }
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async () => {
    try {
      const user = await authService.getCurrentUser();
      set({ user });
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  },
}));

/**
 * Export selectors for common use cases
 */
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectError = (state: AuthState) => state.error;
export const selectIsInitialized = (state: AuthState) => state.isInitialized;
