'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { sendMessage, isApiConfigured } from '@/lib/api';
import { executeTool, AVAILABLE_TOOLS } from '@/lib/tools';
import { ImageAttachment, Citation } from '@/types';
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
  CheckCircle2,
  Copy,
  Check,
  Mic,
  MicOff,
  Volume2,
  Square,
  Zap,
  Brain,
  Telescope
} from 'lucide-react';
import type { ReasoningEffort } from '@/types';
import MarkdownRenderer from './MarkdownRenderer';

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

// Web検索結果から引用情報を抽出
function extractWebCitations(toolResult: string): Citation[] {
  try {
    const results = JSON.parse(toolResult);
    if (!Array.isArray(results)) return [];
    
    return results
      .filter((r: { url?: string; title?: string }) => r.url && r.url.length > 0)
      .map((r: { url: string; title: string; snippet?: string }) => ({
        type: 'web' as const,
        title: r.title || 'Untitled',
        url: r.url,
        snippet: r.snippet?.substring(0, 150) + (r.snippet && r.snippet.length > 150 ? '...' : ''),
      }));
  } catch {
    return [];
  }
}

// 引用・参照リンク表示コンポーネント
function CitationsPanel({ citations }: { citations: Citation[] }) {
  if (!citations || citations.length === 0) return null;
  
  // 重複を除去（URLまたはdocumentIdで）
  const uniqueCitations = citations.filter((citation, index, self) => {
    const key = citation.url || citation.documentId || citation.title;
    return index === self.findIndex(c => (c.url || c.documentId || c.title) === key);
  });

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-600 dark:text-slate-400">
        <Search className="w-4 h-4" />
        <span>参照元 ({uniqueCitations.length}件)</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {uniqueCitations.map((citation, index) => (
          <CitationLink key={index} citation={citation} index={index + 1} />
        ))}
      </div>
    </div>
  );
}

// 個別の引用リンクコンポーネント
function CitationLink({ citation, index }: { citation: Citation; index: number }) {
  const isWeb = citation.type === 'web' && citation.url;
  
  const content = (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer group">
      <span className="flex items-center justify-center w-5 h-5 bg-purple-500 text-white text-xs font-bold rounded-full">
        {index}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
          {citation.title}
        </div>
        {citation.snippet && (
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
            {citation.snippet}
          </div>
        )}
      </div>
      {isWeb && (
        <svg className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}
      {!isWeb && citation.documentId && (
        <span className="text-xs text-slate-400 bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded">
          RAG
        </span>
      )}
    </div>
  );

  if (isWeb && citation.url) {
    return (
      <a 
        href={citation.url} 
        target="_blank" 
        rel="noopener noreferrer"
        title={`${citation.title}\n${citation.url}`}
      >
        {content}
      </a>
    );
  }

  return (
    <div title={citation.documentId ? `Document ID: ${citation.documentId}` : citation.title}>
      {content}
    </div>
  );
}

// コピーボタンコンポーネント
function MessageCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
      title="メッセージをコピー"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

export default function ChatArea() {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const {
    chats,
    currentChatId,
    apiConfig,
    isLoading,
    agentState,
    createNewChat,
    addMessage,
    updateLastMessage,
    updateLastMessageCitations,
    updateChatTitle,
    setLoading,
    setAgentState,
    resetAgentState,
    toggleSettings,
    setApiConfig,
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

  // 音声入力機能
  const startVoiceInput = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowWithSpeech = window as any;
    const SpeechRecognitionAPI = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      alert('お使いのブラウザは音声入力に対応していません');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'ja-JP';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((result: any) => result[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.start();
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
      const isDeepResearch = apiConfig.enableDeepResearch;
      
      const normalSystemPrompt = `あなたは親切で有能なAIアシスタントです。ユーザーの質問に対して、必要に応じてツールを使用して回答してください。

利用可能なツール:
- web_search: 最新の情報やニュースを検索するときに使用
- get_current_time: 現在の日時を取得するときに使用
- calculator: 数学的な計算を行うときに使用

ツールを使用した後は、その結果を元に分かりやすく回答してください。日本語で回答してください。`;

      const deepResearchPrompt = `あなたは高度な調査能力を持つリサーチAIアシスタントです。
Deep Researchモードが有効です。ユーザーの質問に対して、徹底的で包括的な調査を行ってください。

## Deep Research 調査手順

1. **初期分析**: 質問を分析し、必要な情報を特定
2. **多角的検索**: 複数の異なる検索クエリで情報を収集（最低3-5回の検索を推奨）
3. **情報の統合**: 複数のソースから得た情報を統合・比較
4. **深掘り調査**: 初期結果で見つかった重要なトピックをさらに掘り下げ
5. **包括的レポート作成**: 調査結果を構造化してまとめる

## 利用可能なツール
- web_search: Web検索（複数回使用して多角的に調査）
- get_current_time: 現在の日時を取得
- calculator: 数学的な計算

## レポート形式
調査完了後、以下の形式でレポートを作成してください：

### 📊 調査レポート: [トピック]

#### 概要
[調査結果の要約]

#### 主要な発見
1. [発見1]
2. [発見2]
3. [発見3]

#### 詳細分析
[詳細な分析結果]

#### 結論・推奨事項
[結論とユーザーへの推奨事項]

---
**重要**: 必ず複数の検索を実行し、情報の信頼性を確認してください。
日本語で回答してください。`;

      const systemMessage = {
        id: 'system',
        role: 'system' as const,
        content: isDeepResearch ? deepResearchPrompt : normalSystemPrompt,
        timestamp: new Date(),
      };

      const messagesWithSystem = [systemMessage, ...messagesToSend];
      
      let iterations = 0;
      // DeepResearchモードでは最大イテレーション数を増やす（より多くの検索を許可）
      const maxIterations = isDeepResearch ? 10 : 5;
      let currentMessages = [...messagesWithSystem];
      let finalContent = '';
      const allCitations: Citation[] = []; // 全ての引用を収集

      while (iterations < maxIterations) {
        iterations++;

        const response = await sendMessage(currentMessages, apiConfig, {
          onChunk: (chunk) => {
            updateLastMessage(chatId!, chunk);
          },
          onToolCall: (toolName) => {
            setAgentState({ currentTool: toolName });
          },
          onCitations: (citations) => {
            // RAG検索の引用を収集
            allCitations.push(...citations);
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
        const toolResults: Array<{ toolCallId: string; result: string; toolName: string }> = [];
        
        for (const toolCall of response.toolCalls) {
          const toolName = toolCall.function.name;
          setAgentState({ currentTool: toolName });

          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch {
            args = {};
          }

          // Pass search config to executeTool
          const searchConfig = {
            provider: apiConfig.searchProvider || 'duckduckgo',
            tavilyApiKey: apiConfig.tavilyApiKey,
            braveApiKey: apiConfig.braveApiKey,
          };
          const result = await executeTool(toolName, args, searchConfig);
          toolResults.push({ toolCallId: toolCall.id, result, toolName });
          
          // Web検索結果から引用を抽出して全体の引用リストに追加
          if (toolName === 'web_search') {
            const webCitations = extractWebCitations(result);
            allCitations.push(...webCitations);
          }
          
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

      // 最終的なメッセージに引用情報を追加
      if (allCitations.length > 0 && chatId) {
        updateLastMessageCitations(chatId, allCitations);
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
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {apiConfig.provider === 'azure-openai' 
                  ? `Azure OpenAI${apiConfig.azureDeploymentName ? ` (${apiConfig.azureDeploymentName})` : ''}`
                  : apiConfig.provider === 'google-gemini'
                  ? `Gemini (${apiConfig.geminiModel || 'gemini-2.0-flash-exp'})`
                  : 'Unknown'
                }
              </p>
              {apiConfig.enableAgent && (
                <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full">
                  Agent
                </span>
              )}
              {apiConfig.enableRAG && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full">
                  RAG
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
                      message.role === 'assistant' ? (
                        <div className="text-sm leading-relaxed">
                          <MarkdownRenderer content={message.content} />
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {message.content}
                        </div>
                      )
                    ) : (
                      isLoading && idx === currentChat.messages.length - 1 && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">考え中...</span>
                        </div>
                      )
                    )}
                    
                    {/* Citations/References - 引用・参照リンク */}
                    {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
                      <CitationsPanel citations={message.citations} />
                    )}
                    
                    {/* Message Actions */}
                    {message.content && message.role === 'assistant' && (
                      <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <MessageCopyButton text={message.content} />
                        <button
                          onClick={() => {
                            if ('speechSynthesis' in window) {
                              if (isSpeaking) {
                                window.speechSynthesis.cancel();
                                setIsSpeaking(false);
                              } else {
                                const utterance = new SpeechSynthesisUtterance(message.content);
                                utterance.lang = 'ja-JP';
                                utterance.onend = () => setIsSpeaking(false);
                                window.speechSynthesis.speak(utterance);
                                setIsSpeaking(true);
                              }
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="読み上げ"
                        >
                          <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-purple-500' : ''}`} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Agent Status */}
              {agentState.isThinking && agentState.currentTool && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  apiConfig.enableDeepResearch 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800'
                    : 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800'
                }`}>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                    apiConfig.enableDeepResearch
                      ? 'bg-indigo-100 dark:bg-indigo-800'
                      : 'bg-purple-100 dark:bg-purple-800'
                  }`}>
                    {apiConfig.enableDeepResearch ? (
                      <Telescope className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                    ) : (
                      <Wrench className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {TOOL_ICONS[agentState.currentTool]}
                      <span className={`text-sm font-medium ${
                        apiConfig.enableDeepResearch
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-purple-700 dark:text-purple-300'
                      }`}>
                        {apiConfig.enableDeepResearch && '🔬 Deep Research: '}
                        {TOOL_LABELS[agentState.currentTool] || agentState.currentTool} を実行中...
                      </span>
                    </div>
                  </div>
                  <Loader2 className={`w-4 h-4 animate-spin ${
                    apiConfig.enableDeepResearch ? 'text-indigo-500' : 'text-purple-500'
                  }`} />
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
          {/* Quick Settings Bar - 推論強度 & DeepResearch */}
          <div className="flex items-center gap-4 mb-3 px-1">
            {/* 推論強度セレクター */}
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">推論強度:</span>
              <div className="flex gap-1">
                {[
                  { value: 'low', label: '弱', icon: '⚡', color: 'text-green-500 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' },
                  { value: 'medium', label: '中', icon: '⚖️', color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' },
                  { value: 'high', label: '強', icon: '🔥', color: 'text-red-500 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setApiConfig({ reasoningEffort: option.value as ReasoningEffort })}
                    className={`px-2 py-1 text-xs rounded-lg border transition-all ${
                      (apiConfig.reasoningEffort || 'medium') === option.value
                        ? option.color + ' font-medium'
                        : 'text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    title={`推論強度: ${option.label}`}
                  >
                    {option.icon} {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* DeepResearch トグル */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setApiConfig({ enableDeepResearch: !apiConfig.enableDeepResearch })}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  apiConfig.enableDeepResearch
                    ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 font-medium'
                    : 'text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Deep Research: 複数回の検索と深い分析を行います"
              >
                <Telescope className={`w-4 h-4 ${apiConfig.enableDeepResearch ? 'text-purple-500' : ''}`} />
                <span>Deep Research</span>
                {apiConfig.enableDeepResearch && (
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                )}
              </button>
            </div>
          </div>
          
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
            
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={startVoiceInput}
              disabled={!isConfigured || isLoading}
              className={`m-2 p-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30'
              }`}
              title="音声入力"
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
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
            Enter で送信 / Shift + Enter で改行 / 🎤 音声入力 / 画像もアップロード可能
          </p>
        </form>
      </div>
    </div>
  );
}
