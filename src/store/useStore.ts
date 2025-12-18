'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Chat, Message, APIConfig, APIProvider, AgentState, SearchProvider } from '@/types';

interface AppState {
  // Chats
  chats: Chat[];
  currentChatId: string | null;
  
  // API Config
  apiConfig: APIConfig;
  
  // UI State
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;
  isLoading: boolean;
  
  // Agent State
  agentState: AgentState;
  
  // Actions
  createNewChat: () => string;
  deleteChat: (chatId: string) => void;
  setCurrentChat: (chatId: string) => void;
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateLastMessage: (chatId: string, content: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  
  setApiConfig: (config: Partial<APIConfig>) => void;
  
  toggleSidebar: () => void;
  toggleSettings: () => void;
  setLoading: (loading: boolean) => void;
  
  // Agent actions
  setAgentState: (state: Partial<AgentState>) => void;
  resetAgentState: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const initialAgentState: AgentState = {
  isThinking: false,
  currentTool: undefined,
  toolResults: [],
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      chats: [],
      currentChatId: null,
      
      apiConfig: {
        provider: 'google-gemini' as APIProvider,
        azureEndpoint: '',
        azureApiKey: '',
        azureDeploymentName: '',
        azureApiVersion: '2024-12-01-preview',
        geminiApiKey: '',
        geminiModel: 'gemini-2.0-flash-exp',
        enableAgent: true,
        searchProvider: 'duckduckgo' as SearchProvider,
        tavilyApiKey: '',
        braveApiKey: '',
      },
      
      isSidebarOpen: true,
      isSettingsOpen: false,
      isLoading: false,
      
      agentState: initialAgentState,
      
      createNewChat: () => {
        const newChat: Chat = {
          id: generateId(),
          title: '新しいチャット',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          chats: [newChat, ...state.chats],
          currentChatId: newChat.id,
        }));
        return newChat.id;
      },
      
      deleteChat: (chatId) => {
        set((state) => {
          const newChats = state.chats.filter((c) => c.id !== chatId);
          return {
            chats: newChats,
            currentChatId: state.currentChatId === chatId 
              ? (newChats[0]?.id || null) 
              : state.currentChatId,
          };
        });
      },
      
      setCurrentChat: (chatId) => {
        set({ currentChatId: chatId });
      },
      
      addMessage: (chatId, message) => {
        const newMessage: Message = {
          ...message,
          id: generateId(),
          timestamp: new Date(),
        };
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [...chat.messages, newMessage],
                  updatedAt: new Date(),
                }
              : chat
          ),
        }));
      },
      
      updateLastMessage: (chatId, content) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map((msg, idx) =>
                    idx === chat.messages.length - 1
                      ? { ...msg, content }
                      : msg
                  ),
                  updatedAt: new Date(),
                }
              : chat
          ),
        }));
      },
      
      updateChatTitle: (chatId, title) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, title } : chat
          ),
        }));
      },
      
      setApiConfig: (config) => {
        set((state) => ({
          apiConfig: { ...state.apiConfig, ...config },
        }));
      },
      
      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
      },
      
      toggleSettings: () => {
        set((state) => ({ isSettingsOpen: !state.isSettingsOpen }));
      },
      
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
      
      setAgentState: (newState) => {
        set((state) => ({
          agentState: { ...state.agentState, ...newState },
        }));
      },
      
      resetAgentState: () => {
        set({ agentState: initialAgentState });
      },
    }),
    {
      name: 'ai-chat-agent-storage-v3',
      partialize: (state) => ({
        chats: state.chats,
        apiConfig: state.apiConfig,
      }),
    }
  )
);
