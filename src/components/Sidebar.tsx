'use client';

import { useStore } from '@/store/useStore';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Settings, 
  Menu,
  X,
  Sparkles,
  Pin,
  PinOff,
  Database
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function Sidebar() {
  const {
    chats,
    currentChatId,
    isSidebarOpen,
    createNewChat,
    deleteChat,
    setCurrentChat,
    toggleSidebar,
    toggleSettings,
    togglePinChat,
  } = useStore();

  // ピン留めされたチャットを上に表示
  const sortedChats = [...chats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const pinnedChats = sortedChats.filter(c => c.isPinned);
  const unpinnedChats = sortedChats.filter(c => !c.isPinned);

  const handleNewChat = () => {
    createNewChat();
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return format(d, 'M/d HH:mm', { locale: ja });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:relative inset-y-0 left-0 z-50
          w-72 bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AI Chat</span>
          </div>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-purple-200 hover:text-white hover:bg-purple-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            新しいチャット
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-2">
          <div className="space-y-1">
            {chats.length === 0 ? (
              <div className="text-center py-8 text-purple-300/70">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">チャット履歴がありません</p>
                <p className="text-xs mt-1">新しいチャットを始めましょう</p>
              </div>
            ) : (
              <>
                {/* ピン留めされたチャット */}
                {pinnedChats.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center gap-1 px-3 py-1.5 text-xs text-purple-300/70 font-medium">
                      <Pin className="w-3 h-3" />
                      ピン留め
                    </div>
                    {pinnedChats.map((chat) => (
                      <div
                        key={chat.id}
                        className={`
                          group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer
                          transition-all duration-200
                          ${currentChatId === chat.id 
                            ? 'bg-purple-600/50 shadow-lg' 
                            : 'hover:bg-purple-700/30'
                          }
                        `}
                        onClick={() => setCurrentChat(chat.id)}
                      >
                        <Pin className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {chat.title}
                          </p>
                          <p className="text-purple-300/70 text-xs">
                            {formatDate(chat.updatedAt)}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinChat(chat.id);
                            }}
                            className="p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20 rounded-lg"
                            title="ピン留め解除"
                          >
                            <PinOff className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChat(chat.id);
                            }}
                            className="p-1.5 text-purple-300 hover:text-red-400 hover:bg-red-500/20 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 通常のチャット */}
                {unpinnedChats.length > 0 && pinnedChats.length > 0 && (
                  <div className="flex items-center gap-1 px-3 py-1.5 text-xs text-purple-300/70 font-medium">
                    <MessageSquare className="w-3 h-3" />
                    履歴
                  </div>
                )}
                {unpinnedChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`
                      group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer
                      transition-all duration-200
                      ${currentChatId === chat.id 
                        ? 'bg-purple-600/50 shadow-lg' 
                        : 'hover:bg-purple-700/30'
                      }
                    `}
                    onClick={() => setCurrentChat(chat.id)}
                  >
                    <MessageSquare className="w-5 h-5 text-purple-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {chat.title}
                      </p>
                      <p className="text-purple-300/70 text-xs">
                        {formatDate(chat.updatedAt)}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinChat(chat.id);
                        }}
                        className="p-1.5 text-purple-300 hover:text-yellow-400 hover:bg-yellow-500/20 rounded-lg"
                        title="ピン留め"
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="p-1.5 text-purple-300 hover:text-red-400 hover:bg-red-500/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-purple-700/50 space-y-2">
          {/* Private RAG */}
          <Link
            href="/private-rag"
            className="w-full flex items-center gap-3 px-4 py-3 text-purple-200 hover:text-white hover:bg-purple-700/50 rounded-xl transition-all"
          >
            <Database className="w-5 h-5" />
            <span className="font-medium">Private RAG</span>
          </Link>
          
          {/* Settings Button */}
          <button
            onClick={toggleSettings}
            className="w-full flex items-center gap-3 px-4 py-3 text-purple-200 hover:text-white hover:bg-purple-700/50 rounded-xl transition-all"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">API設定</span>
          </button>
        </div>
      </aside>

      {/* Toggle button when sidebar is closed */}
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-30 p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-colors lg:relative lg:top-0 lg:left-0"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}
    </>
  );
}
