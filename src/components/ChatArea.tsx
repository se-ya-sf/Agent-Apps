'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { sendMessage, isApiConfigured } from '@/lib/api';
import { 
  Send, 
  Loader2, 
  User, 
  Bot, 
  Sparkles,
  Settings,
  AlertCircle
} from 'lucide-react';

export default function ChatArea() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    chats,
    currentChatId,
    apiConfig,
    isLoading,
    createNewChat,
    addMessage,
    updateLastMessage,
    updateChatTitle,
    setLoading,
    toggleSettings,
  } = useStore();

  const currentChat = chats.find((c) => c.id === currentChatId);
  const isConfigured = isApiConfigured(apiConfig);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!isConfigured) {
      toggleSettings();
      return;
    }

    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    const userMessage = input.trim();
    setInput('');

    // Add user message
    addMessage(chatId, { role: 'user', content: userMessage });

    // Add placeholder for assistant message
    addMessage(chatId, { role: 'assistant', content: '' });

    setLoading(true);

    try {
      const chat = useStore.getState().chats.find((c) => c.id === chatId);
      if (!chat) return;

      const messagesToSend = chat.messages.filter(m => m.content !== '');

      await sendMessage(
        messagesToSend,
        apiConfig,
        (content) => {
          updateLastMessage(chatId!, content);
        }
      );

      // Update chat title if it's the first message
      if (chat.messages.length <= 2) {
        const title = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '');
        updateChatTitle(chatId!, title);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'エラーが発生しました';
      updateLastMessage(chatId!, `エラー: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const suggestedQuestions = [
    '今日の天気を教えて',
    'おすすめの本を紹介して',
    'プログラミングについて学びたい',
    '旅行プランを立てて',
  ];

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 h-screen">
      {/* Chat Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">AI Chat</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {apiConfig.provider === 'azure-openai' ? 'Azure OpenAI' : 'Google Gemini'}
            </p>
          </div>
        </div>
        
        {!isConfigured && (
          <button
            onClick={toggleSettings}
            className="flex items-center gap-2 px-4 py-2 text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 rounded-lg transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">APIを設定</span>
          </button>
        )}
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {!currentChat || currentChat.messages.length === 0 ? (
            // Welcome Screen
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl animate-pulse">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                何でも聞いてください
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-8">
                質問、相談、アイデアの壁打ちなど、お気軽にどうぞ
              </p>
              
              {/* Suggested Questions */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(question)}
                    className="p-4 text-left text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Chat Messages
            currentChat.messages.map((message, idx) => (
              <div
                key={message.id || idx}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-md
                  ${message.role === 'user' 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }
                `}>
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`
                  max-w-[80%] p-4 rounded-2xl shadow-sm
                  ${message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-md'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-md'
                  }
                `}>
                  {message.content ? (
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {message.content}
                    </div>
                  ) : (
                    isLoading && idx === currentChat.messages.length - 1 && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">考え中...</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4">
          <div className="relative flex items-end gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConfigured ? "メッセージを入力..." : "APIを設定してください"}
              disabled={!isConfigured}
              rows={1}
              className="flex-1 px-4 py-3 bg-transparent text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none resize-none max-h-48 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || !isConfigured}
              className="m-2 p-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-3">
            Enter で送信 / Shift + Enter で改行
          </p>
        </form>
      </div>
    </div>
  );
}
