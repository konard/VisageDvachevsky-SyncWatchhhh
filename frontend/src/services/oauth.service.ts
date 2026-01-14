/**
 * OAuth Service
 * Handles OAuth authentication flows for Google and GitHub
 *
 * NOTE: This implementation requires backend OAuth endpoints to be implemented.
 * Backend TODO:
 * - POST /api/auth/oauth/google - Initiate Google OAuth flow
 * - POST /api/auth/oauth/github - Initiate GitHub OAuth flow
 * - GET /api/auth/oauth/callback - Handle OAuth callback
 */

export type OAuthProvider = 'google' | 'github';

/**
 * OAuth configuration
 */
const OAUTH_CONFIG = {
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/auth/callback/google`,
    scope: 'email profile',
  },
  github: {
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/auth/callback/github`,
    scope: 'user:email read:user',
  },
};

/**
 * OAuth Service
 * Manages OAuth authentication flows
 */
export class OAuthService {
  /**
   * Initiate OAuth flow by redirecting to provider's authorization URL
   *
   * BACKEND REQUIREMENT:
   * - Backend should generate and return the OAuth authorization URL
   * - Backend should store CSRF state token for verification
   *
   * @param provider - OAuth provider (google or github)
   */
  initiateOAuth(provider: OAuthProvider): void {
    const config = OAUTH_CONFIG[provider];

    if (!config.clientId) {
      console.error(`OAuth client ID for ${provider} is not configured`);
      throw new Error(`OAuth for ${provider} is not configured`);
    }

    // Generate CSRF state token
    const state = this.generateStateToken();
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_provider', provider);

    // Build authorization URL based on provider
    const authUrl = this.buildAuthorizationUrl(provider, state);

    // Redirect to OAuth provider
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth callback after user authorizes
   *
   * BACKEND REQUIREMENT:
   * - Backend endpoint: GET /api/auth/oauth/callback?provider={provider}&code={code}&state={state}
   * - Backend should:
   *   1. Verify state token matches stored value
   *   2. Exchange authorization code for access token
   *   3. Fetch user profile from OAuth provider
   *   4. Create or link user account
   *   5. Return JWT tokens (accessToken, refreshToken, user)
   *
   * @param provider - OAuth provider
   * @param code - Authorization code from provider
   * @param state - State token for CSRF protection
   * @returns Promise with user data and tokens
   */
  async handleCallback(
    provider: OAuthProvider,
    code: string,
    state: string
  ): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    // Verify state token
    const storedState = sessionStorage.getItem('oauth_state');
    const storedProvider = sessionStorage.getItem('oauth_provider');

    if (!storedState || storedState !== state) {
      throw new Error('Invalid state token - possible CSRF attack');
    }

    if (storedProvider !== provider) {
      throw new Error('Provider mismatch');
    }

    // Clear stored state
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_provider');

    // Call backend to complete OAuth flow
    // TODO: This endpoint needs to be implemented on the backend
    throw new Error(
      `OAuth callback handling not implemented on backend. ` +
      `Backend needs to implement: POST /api/auth/oauth/callback/${provider}`
    );

    /* EXPECTED BACKEND IMPLEMENTATION:
    const response = await api.post(`/api/auth/oauth/callback/${provider}`, {
      code,
      state,
    });

    return {
      user: response.data.user,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };
    */
  }

  /**
   * Generate CSRF state token
   */
  private generateStateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Build authorization URL for OAuth provider
   */
  private buildAuthorizationUrl(provider: OAuthProvider, state: string): string {
    const config = OAUTH_CONFIG[provider];

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      state,
      response_type: 'code',
    });

    if (provider === 'google') {
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } else if (provider === 'github') {
      return `https://github.com/login/oauth/authorize?${params.toString()}`;
    }

    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

// Export singleton instance
export const oauthService = new OAuthService();
