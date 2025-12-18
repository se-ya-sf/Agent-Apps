export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  // For tool calls
  toolCalls?: ToolCall[];
  toolCallId?: string;
  // For images
  images?: ImageAttachment[];
  // For audio
  audioUrl?: string;
}

export interface ImageAttachment {
  id: string;
  url: string; // base64 data URL or URL
  mimeType: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  result: string;
  isError?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  // Pin feature
  isPinned?: boolean;
}

export type APIProvider = 'azure-openai' | 'google-gemini' | 'anthropic-claude' | 'xai-grok' | 'nano-banana';
export type SearchProvider = 'tavily' | 'brave' | 'duckduckgo';

export interface APIConfig {
  provider: APIProvider;
  // Azure OpenAI
  azureEndpoint?: string;
  azureApiKey?: string;
  azureDeploymentName?: string;
  azureApiVersion?: string;
  // Google Gemini
  geminiApiKey?: string;
  geminiModel?: string;
  // Anthropic Claude
  claudeApiKey?: string;
  claudeModel?: string;
  // xAI Grok
  grokApiKey?: string;
  grokModel?: string;
  // Nano Banana
  nanoBananaApiKey?: string;
  nanoBananaModel?: string;
  // Agent settings
  enableAgent?: boolean;
  // Search API settings
  searchProvider?: SearchProvider;
  tavilyApiKey?: string;
  braveApiKey?: string;
  // RAG settings (Azure AI Search)
  enableRAG?: boolean;
  azureSearchEndpoint?: string;
  azureSearchApiKey?: string;
  azureSearchIndexName?: string;
}

export interface AppSettings {
  apiConfig: APIConfig;
  theme: 'light' | 'dark' | 'system';
}

// Tool definitions
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface AgentState {
  isThinking: boolean;
  currentTool?: string;
  toolResults?: ToolResult[];
}

// Azure OpenAI Model Presets (2025年12月現在の最新)
export const AZURE_OPENAI_API_VERSIONS = [
  '2025-01-01-preview',  // 最新 (GPT-5対応)
  '2024-12-01-preview',  // GPT-4o Audio対応
  '2024-10-21',          // GA版
  '2024-08-01-preview',  // Structured Outputs
  '2024-05-01-preview',
  '2024-02-15-preview',
] as const;

// Azure OpenAI v1 API (2025年8月以降)
export const AZURE_OPENAI_V1_ENABLED = false; // v1 API有効化フラグ

// Google Gemini Model Options (2025年12月現在)
export const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (実験版)', description: 'エージェント向け最適化' },
  { value: 'gemini-2.0-flash-thinking-exp-01-21', label: 'Gemini 2.0 Flash Thinking', description: '推論特化・最新' },
  { value: 'gemini-2.5-pro-preview', label: 'Gemini 2.5 Pro (プレビュー)', description: '最高性能' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: '高速・安定版' },
  { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B', description: '軽量版' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: '高性能・大容量コンテキスト' },
] as const;

// Claude Model Options (Anthropic API)
export const CLAUDE_MODELS = [
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4', description: '最高性能・最新' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', description: 'バランス型・最新' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'コスパ良好' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', description: '高速・軽量' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', description: '高性能' },
] as const;

// xAI Grok Model Options
export const GROK_MODELS = [
  { value: 'grok-3', label: 'Grok-3', description: '最新・高性能' },
  { value: 'grok-3-mini', label: 'Grok-3 Mini', description: '軽量・高速' },
  { value: 'grok-2-1212', label: 'Grok-2', description: '安定版' },
] as const;

// Nano Banana Model Options
export const NANO_BANANA_MODELS = [
  { value: 'nano-banana-pro', label: 'Nano Banana Pro', description: '画像生成・最高性能' },
  { value: 'nano-banana-lite', label: 'Nano Banana Lite', description: '軽量版' },
] as const;
