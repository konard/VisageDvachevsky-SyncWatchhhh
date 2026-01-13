/**
 * TypeScript type definitions for YouTube IFrame API
 * Based on: https://developers.google.com/youtube/iframe_api_reference
 */

declare namespace YT {
  // Player State
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  // Player Error
  enum PlayerError {
    INVALID_PARAM = 2,
    HTML5_ERROR = 5,
    VIDEO_NOT_FOUND = 100,
    EMBED_NOT_ALLOWED = 101,
    EMBED_NOT_ALLOWED_DISGUISE = 150,
  }

  // Player Events
  interface PlayerEvent {
    target: Player;
  }

  interface OnStateChangeEvent extends PlayerEvent {
    data: PlayerState;
  }

  interface OnPlaybackQualityChangeEvent extends PlayerEvent {
    data: string;
  }

  interface OnPlaybackRateChangeEvent extends PlayerEvent {
    data: number;
  }

  interface OnErrorEvent extends PlayerEvent {
    data: PlayerError;
  }

  // Player Options
  interface PlayerOptions {
    height?: string | number;
    width?: string | number;
    videoId?: string;
    playerVars?: PlayerVars;
    events?: Events;
  }

  interface PlayerVars {
    autoplay?: 0 | 1;
    cc_load_policy?: 0 | 1;
    color?: 'red' | 'white';
    controls?: 0 | 1 | 2;
    disablekb?: 0 | 1;
    enablejsapi?: 0 | 1;
    end?: number;
    fs?: 0 | 1;
    hl?: string;
    iv_load_policy?: 1 | 3;
    list?: string;
    listType?: 'playlist' | 'search' | 'user_uploads';
    loop?: 0 | 1;
    modestbranding?: 0 | 1;
    origin?: string;
    playlist?: string;
    playsinline?: 0 | 1;
    rel?: 0 | 1;
    showinfo?: 0 | 1;
    start?: number;
    widget_referrer?: string;
  }

  interface Events {
    onReady?: (event: PlayerEvent) => void;
    onStateChange?: (event: OnStateChangeEvent) => void;
    onPlaybackQualityChange?: (event: OnPlaybackQualityChangeEvent) => void;
    onPlaybackRateChange?: (event: OnPlaybackRateChangeEvent) => void;
    onError?: (event: OnErrorEvent) => void;
    onApiChange?: (event: PlayerEvent) => void;
  }

  // Player Class
  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions);

    // Queueing functions
    loadVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void;
    loadVideoById(options: {
      videoId: string;
      startSeconds?: number;
      endSeconds?: number;
      suggestedQuality?: string;
    }): void;
    cueVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void;
    cueVideoById(options: {
      videoId: string;
      startSeconds?: number;
      endSeconds?: number;
      suggestedQuality?: string;
    }): void;

    // Playback controls
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    clearVideo(): void;

    // Playback status
    getPlayerState(): PlayerState;
    getCurrentTime(): number;
    getDuration(): number;
    getVideoLoadedFraction(): number;
    getVideoUrl(): string;
    getVideoEmbedCode(): string;

    // Playback settings
    setPlaybackRate(suggestedRate: number): void;
    getPlaybackRate(): number;
    getAvailablePlaybackRates(): number[];

    // Volume controls
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    setVolume(volume: number): void;
    getVolume(): number;

    // Playlist controls
    nextVideo(): void;
    previousVideo(): void;
    getPlaylist(): string[];
    getPlaylistIndex(): number;

    // Event listeners
    addEventListener(event: string, listener: (event: any) => void): void;
    removeEventListener(event: string, listener: (event: any) => void): void;

    // DOM manipulation
    destroy(): void;
    getIframe(): HTMLIFrameElement;
  }
}
