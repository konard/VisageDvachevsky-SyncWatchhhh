import { create } from 'zustand';

/**
 * System event types for chat messages
 */
export type SystemEvent =
  | { kind: 'join'; username: string }
  | { kind: 'leave'; username: string }
  | { kind: 'play' }
  | { kind: 'pause' }
  | { kind: 'seek'; position: number };

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  userId?: string;
  username?: string;
  avatarUrl?: string;
  content?: string;
  event?: SystemEvent;
  timestamp: number;
  // Optimistic update fields
  pending?: boolean;
  failed?: boolean;
  tempId?: string; // Temporary ID for optimistic updates
}

/**
 * Message delivery status
 */
export type MessageStatus = 'sending' | 'sent' | 'failed';

/**
 * Typing indicator state
 */
export interface TypingUser {
  userId: string;
  username: string;
  startedAt: number;
}

/**
 * Chat store state
 */
interface ChatStore {
  // Messages
  messages: ChatMessage[];
  hasMoreHistory: boolean;
  isLoadingHistory: boolean;

  // Typing indicators
  typingUsers: Map<string, TypingUser>;

  // Connection state
  isConnected: boolean;

  // Actions
  addMessage: (message: ChatMessage) => void;
  addOptimisticMessage: (tempId: string, content: string, userId: string, username: string) => void;
  confirmMessage: (tempId: string, confirmedMessage: ChatMessage) => void;
  failMessage: (tempId: string) => void;
  retryMessage: (tempId: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  prependMessages: (messages: ChatMessage[]) => void;
  setHasMoreHistory: (hasMore: boolean) => void;
  setIsLoadingHistory: (isLoading: boolean) => void;

  // Typing indicators
  addTypingUser: (userId: string, username: string) => void;
  removeTypingUser: (userId: string) => void;
  clearTypingUsers: () => void;

  // Connection
  setIsConnected: (connected: boolean) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  messages: [],
  hasMoreHistory: false,
  isLoadingHistory: false,
  typingUsers: new Map<string, TypingUser>(),
  isConnected: false,
};

/**
 * Zustand store for managing chat state
 */
export const useChatStore = create<ChatStore>((set, get) => ({
  ...initialState,

  addMessage: (message) =>
    set((state) => {
      // Avoid duplicate messages
      if (state.messages.some((m) => m.id === message.id)) {
        return state;
      }
      return {
        messages: [...state.messages, message],
      };
    }),

  addOptimisticMessage: (tempId, content, userId, username) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: tempId,
          tempId,
          type: 'user' as const,
          userId,
          username,
          content,
          timestamp: Date.now(),
          pending: true,
        },
      ],
    })),

  confirmMessage: (tempId, confirmedMessage) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.tempId === tempId
          ? { ...confirmedMessage, pending: false, failed: false }
          : msg
      ),
    })),

  failMessage: (tempId) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.tempId === tempId
          ? { ...msg, pending: false, failed: true }
          : msg
      ),
    })),

  retryMessage: (tempId) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.tempId === tempId
          ? { ...msg, pending: true, failed: false }
          : msg
      ),
    })),

  setMessages: (messages) => set({ messages }),

  prependMessages: (messages) =>
    set((state) => {
      // Filter out duplicates
      const existingIds = new Set(state.messages.map((m) => m.id));
      const newMessages = messages.filter((m) => !existingIds.has(m.id));
      return {
        messages: [...newMessages, ...state.messages],
      };
    }),

  setHasMoreHistory: (hasMore) => set({ hasMoreHistory: hasMore }),

  setIsLoadingHistory: (isLoading) => set({ isLoadingHistory: isLoading }),

  addTypingUser: (userId, username) =>
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      newTypingUsers.set(userId, { userId, username, startedAt: Date.now() });
      return { typingUsers: newTypingUsers };
    }),

  removeTypingUser: (userId) =>
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      newTypingUsers.delete(userId);
      return { typingUsers: newTypingUsers };
    }),

  clearTypingUsers: () => set({ typingUsers: new Map() }),

  setIsConnected: (connected) => set({ isConnected: connected }),

  reset: () => set(initialState),
}));
