'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Chat, Message, APIConfig, APIProvider } from '@/types';

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
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      chats: [],
      currentChatId: null,
      
      apiConfig: {
        provider: 'azure-openai' as APIProvider,
        azureEndpoint: '',
        azureApiKey: '',
        azureDeploymentName: '',
        azureApiVersion: '2024-02-15-preview',
        geminiApiKey: '',
        geminiModel: 'gemini-1.5-flash',
      },
      
      isSidebarOpen: true,
      isSettingsOpen: false,
      isLoading: false,
      
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
    }),
    {
      name: 'rakuten-ai-clone-storage',
      partialize: (state) => ({
        chats: state.chats,
        apiConfig: state.apiConfig,
      }),
    }
  )
);
