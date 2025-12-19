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

// Azure OpenAI で Claude/Grok 等も提供されるため、プロバイダーは2つに統合
export type APIProvider = 'azure-openai' | 'google-gemini';
export type SearchProvider = 'tavily' | 'brave' | 'duckduckgo';

export interface APIConfig {
  provider: APIProvider;
  // Azure OpenAI (GPT-4o, GPT-5, Claude, Grok 等全てのモデルをデプロイメント名で指定)
  azureEndpoint?: string;
  azureApiKey?: string;
  azureDeploymentName?: string;
  azureApiVersion?: string;
  // Google Gemini
  geminiApiKey?: string;
  geminiModel?: string;
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
  '2025-04-01-preview',  // 最新 (GPT-5/5.1/5.2対応・必須)
  '2025-03-01-preview',  // GPT-5対応
  '2025-01-01-preview',  // GPT-5対応
  '2024-12-01-preview',  // GPT-4o Audio対応
  '2024-10-21',          // GA版 (GPT-4o等)
  '2024-08-01-preview',  // Structured Outputs
] as const;

// GPT-5系モデル (reasoning models) かどうかを判定するヘルパー
// 参照: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/reasoning
// GPT-5シリーズ、o1/o3/o4シリーズはreasoningモデルで、max_tokens等がサポートされない
export const isGPT5Model = (deploymentName?: string): boolean => {
  if (!deploymentName) return false;
  const name = deploymentName.toLowerCase();
  
  // GPT-5 シリーズ: gpt-5, gpt-5.1, gpt-5.2, gpt-5-chat, gpt-5.1-chat, gpt-5.2-chat など
  // ドット付き (gpt-5.1) とハイフン付き (gpt-5-1) の両方をサポート
  if (name.includes('gpt-5') || name.includes('gpt5')) return true;
  
  // O-series reasoning models: o1, o1-preview, o1-mini, o3, o3-mini, o3-pro, o4-mini
  // 正規表現でoの後に数字が続くパターンをチェック
  if (/\bo[134]-/.test(name) || /\bo[134]$/.test(name) || /\bo[134]mini/.test(name)) return true;
  
  // codex-mini (reasoning model)
  if (name === 'codex-mini' || name.includes('codex-mini')) return true;
  
  return false;
};

// 新しいAPIバージョン（2025年以降）かどうかを判定
// 2025年以降のAPIでは max_completion_tokens を使用
export const useMaxCompletionTokens = (apiVersion?: string, deploymentName?: string): boolean => {
  // GPT-5系モデルは必ず max_completion_tokens を使用
  if (isGPT5Model(deploymentName)) return true;
  
  // 2025年以降のAPIバージョンは max_completion_tokens を使用
  if (apiVersion && apiVersion >= '2025-01-01') return true;
  
  return false;
};

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

// Azure OpenAI で利用可能なモデル例（デプロイメント名の例）
export const AZURE_DEPLOYMENT_EXAMPLES = [
  // OpenAI モデル
  { category: 'OpenAI GPT', examples: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4'] },
  { category: 'OpenAI GPT-5', examples: ['gpt-5-chat', 'gpt-5.1-chat', 'gpt-5.2-chat', 'gpt-5-mini'] },
  { category: 'OpenAI o-series', examples: ['o1', 'o1-mini', 'o3', 'o3-mini', 'o4-mini'] },
  // Anthropic Claude (Azure経由)
  { category: 'Claude', examples: ['claude-opus-4-1', 'claude-sonnet-4', 'claude-3-5-sonnet'] },
  // xAI Grok (Azure経由)
  { category: 'Grok', examples: ['grok-3', 'grok-3-mini'] },
] as const;
