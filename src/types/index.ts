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
}

export type APIProvider = 'azure-openai' | 'google-gemini';
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
  // Agent settings
  enableAgent?: boolean;
  // Search API settings
  searchProvider?: SearchProvider;
  tavilyApiKey?: string;
  braveApiKey?: string;
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

// Azure OpenAI Model Presets
export const AZURE_OPENAI_API_VERSIONS = [
  '2024-12-01-preview',
  '2024-10-21',
  '2024-08-01-preview',
  '2024-05-01-preview',
  '2024-02-15-preview',
] as const;

// Google Gemini Model Options
export const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (実験版・最新)', description: 'エージェント向け最適化' },
  { value: 'gemini-2.0-flash-thinking-exp', label: 'Gemini 2.0 Flash Thinking', description: '推論特化' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: '高速・安定版' },
  { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B', description: '軽量版' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: '高性能' },
] as const;
