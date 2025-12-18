'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { sendMessage, isApiConfigured } from '@/lib/api';
import { executeTool, AVAILABLE_TOOLS } from '@/lib/tools';
import { ImageAttachment, ToolCall } from '@/types';
import { 
  Send, 
  Loader2, 
  User, 
  Bot, 
  Sparkles,
  AlertCircle,
  Image as ImageIcon,
  X,
  Search,
  Calculator,
  Clock,
  Eye,
  Wrench,
  CheckCircle2
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  web_search: <Search className="w-4 h-4" />,
  calculator: <Calculator className="w-4 h-4" />,
  get_current_time: <Clock className="w-4 h-4" />,
  analyze_image: <Eye className="w-4 h-4" />,
};

const TOOL_LABELS: Record<string, string> = {
  web_search: 'Web検索',
  calculator: '計算',
  get_current_time: '現在時刻取得',
  analyze_image: '画像分析',
};

export default function ChatArea() {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    chats,
    currentChatId,
    apiConfig,
    isLoading,
    agentState,
    createNewChat,
    addMessage,
    updateLastMessage,
    updateChatTitle,
    setLoading,
    setAgentState,
    resetAgentState,
    toggleSettings,
  } = useStore();

  const currentChat = chats.find((c) => c.id === currentChatId);
  const isConfigured = isApiConfigured(apiConfig);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages, agentState]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage: ImageAttachment = {
          id: Math.random().toString(36).substring(2, 15),
          url: event.target?.result as string,
          mimeType: file.type,
          name: file.name,
        };
        setImages((prev) => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && images.length === 0) || isLoading) return;

    if (!isConfigured) {
      toggleSettings();
      return;
    }

    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    const userMessage = input.trim();
    const userImages = [...images];
    setInput('');
    setImages([]);
    resetAgentState();

    // Add user message with images
    addMessage(chatId, { 
      role: 'user', 
      content: userMessage,
      images: userImages.length > 0 ? userImages : undefined,
    });

    // Add placeholder for assistant message
    addMessage(chatId, { role: 'assistant', content: '' });

    setLoading(true);
    setAgentState({ isThinking: true });

    try {
      const chat = useStore.getState().chats.find((c) => c.id === chatId);
      if (!chat) return;

      const messagesToSend = chat.messages.filter(m => m.content !== '' || (m.images && m.images.length > 0));

      // Add system message for agent behavior
      const systemMessage = {
        id: 'system',
        role: 'system' as const,
        content: `あなたは親切で有能なAIアシスタントです。ユーザーの質問に対して、必要に応じてツールを使用して回答してください。

利用可能なツール:
- web_search: 最新の情報やニュースを検索するときに使用
- get_current_time: 現在の日時を取得するときに使用
- calculator: 数学的な計算を行うときに使用

ツールを使用した後は、その結果を元に分かりやすく回答してください。日本語で回答してください。`,
        timestamp: new Date(),
      };

      const messagesWithSystem = [systemMessage, ...messagesToSend];
      
      let iterations = 0;
      const maxIterations = 5;
      let currentMessages = [...messagesWithSystem];
      let finalContent = '';

      while (iterations < maxIterations) {
        iterations++;

        const response = await sendMessage(currentMessages, apiConfig, {
          onChunk: (chunk) => {
            updateLastMessage(chatId!, chunk);
          },
          onToolCall: (toolName) => {
            setAgentState({ currentTool: toolName });
          },
          enableAgent: apiConfig.enableAgent,
          images: userImages,
        });

        // If no tool calls, we're done
        if (!response.toolCalls || response.toolCalls.length === 0) {
          finalContent = response.content;
          break;
        }

        // Process tool calls
        const toolResults: Array<{ toolCallId: string; result: string }> = [];
        
        for (const toolCall of response.toolCalls) {
          const toolName = toolCall.function.name;
          setAgentState({ currentTool: toolName });

          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch {
            args = {};
          }

          const result = await executeTool(toolName, args);
          toolResults.push({ toolCallId: toolCall.id, result });
          
          setAgentState({ 
            toolResults: [...(useStore.getState().agentState.toolResults || []), { toolCallId: toolCall.id, result }]
          });
        }

        // Add assistant message with tool calls
        currentMessages.push({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.content || '',
          timestamp: new Date(),
          toolCalls: response.toolCalls,
        });

        // Add tool results
        for (const result of toolResults) {
          currentMessages.push({
            id: `tool-${Date.now()}-${result.toolCallId}`,
            role: 'tool',
            content: result.result,
            timestamp: new Date(),
            toolCallId: result.toolCallId,
          });
        }

        setAgentState({ currentTool: undefined });
      }

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
      resetAgentState();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const suggestedQuestions = [
    '今日の天気を検索して',
    '「人工知能」について検索して',
    '123 × 456 を計算して',
    '今何時？',
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
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {apiConfig.provider === 'azure-openai' ? 'Azure OpenAI' : 'Google Gemini'}
              </p>
              {apiConfig.enableAgent && (
                <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full">
                  Agent
                </span>
              )}
            </div>
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
                AIエージェントに何でも聞いてください
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-4">
                Web検索、計算、画像認識など、様々なツールを使って回答します
              </p>
              
              {/* Available Tools */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {AVAILABLE_TOOLS.map((tool) => (
                  <div
                    key={tool.name}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-600 dark:text-slate-400"
                  >
                    {TOOL_ICONS[tool.name]}
                    <span>{TOOL_LABELS[tool.name]}</span>
                  </div>
                ))}
              </div>
              
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
            <>
              {currentChat.messages.map((message, idx) => (
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
                    {/* Images */}
                    {message.images && message.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {message.images.map((img) => (
                          <img
                            key={img.id}
                            src={img.url}
                            alt={img.name || 'uploaded image'}
                            className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                    
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
              ))}
              
              {/* Agent Status */}
              {agentState.isThinking && agentState.currentTool && (
                <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-lg">
                    <Wrench className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {TOOL_ICONS[agentState.currentTool]}
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        {TOOL_LABELS[agentState.currentTool] || agentState.currentTool} を実行中...
                      </span>
                    </div>
                  </div>
                  <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                </div>
              )}
              
              {/* Tool Results Display */}
              {agentState.toolResults && agentState.toolResults.length > 0 && !agentState.currentTool && (
                <div className="space-y-2">
                  {agentState.toolResults.map((result, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-green-700 dark:text-green-300">
                          ツール実行完了
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4">
          {/* Image Preview */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {images.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.url}
                    alt={img.name || 'preview'}
                    className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="relative flex items-end gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent transition-all">
            {/* Image Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!isConfigured}
              className="m-2 p-2.5 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConfigured ? "メッセージを入力... (検索、計算、画像分析もできます)" : "APIを設定してください"}
              disabled={!isConfigured}
              rows={1}
              className="flex-1 py-3 bg-transparent text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none resize-none max-h-48 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={(!input.trim() && images.length === 0) || isLoading || !isConfigured}
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
            Enter で送信 / Shift + Enter で改行 / 画像をアップロードして質問もできます
          </p>
        </form>
      </div>
    </div>
  );
}
