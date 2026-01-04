// 引用・参照情報
export interface Citation {
  type: 'web' | 'rag';
  title: string;
  url?: string;          // Web検索の場合
  documentId?: string;   // RAG検索の場合（chunk_id）
  snippet?: string;      // 引用部分の抜粋
}

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
  // For citations/references
  citations?: Citation[];
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
// 推論強度（GPT-5/o-series models 用）
export type ReasoningEffort = 'low' | 'medium' | 'high';

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
  // Reasoning effort for GPT-5/o-series models
  reasoningEffort?: ReasoningEffort;
  // Deep Research mode - 複数回の検索と分析を行う
  enableDeepResearch?: boolean;
  // Microsoft Graph / Outlook Calendar 連携
  enableOutlook?: boolean;
  microsoftClientId?: string;
  microsoftTenantId?: string;
  // Microsoft Teams 連携
  enableTeams?: boolean;
  // Private RAG (Azure Blob + AI Search)
  enablePrivateRAG?: boolean;
  privateRAGBlobUrl?: string;           // Blob Storage URL
  privateRAGBlobContainer?: string;     // コンテナ名
  privateRAGBlobSasToken?: string;      // SAS Token
  privateRAGSearchEndpoint?: string;    // AI Search エンドポイント
  privateRAGSearchApiKey?: string;      // AI Search API キー
  privateRAGIndexName?: string;         // インデックス名
  privateRAGIndexerName?: string;       // インデクサー名
  privateRAGUserId?: string;            // ユーザーID
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
  // Anthropic Claude (Azure Foundry経由)
  // 参照: https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/how-to/use-foundry-models-claude
  { category: 'Claude', examples: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-1'] },
  // xAI Grok (Azure経由)
  { category: 'Grok', examples: ['grok-3', 'grok-3-mini'] },
] as const;

// Claude モデルかどうかを判定するヘルパー
// Azure Foundry の Claude は専用エンドポイント（/anthropic/v1/messages）が必要
export const isClaudeModel = (deploymentName?: string): boolean => {
  if (!deploymentName) return false;
  const name = deploymentName.toLowerCase();
  return name.includes('claude');
};

// Microsoft Graph / Outlook Calendar 連携
export interface MicrosoftAuthConfig {
  clientId: string;
  tenantId: string;
  redirectUri?: string;
}

// Outlookカレンダーイベント
export interface OutlookCalendarEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  isAllDay?: boolean;
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  attendees?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
    type: string;
    status: {
      response: string;
    };
  }>;
  bodyPreview?: string;
  webLink?: string;
  showAs?: string; // free, tentative, busy, oof, workingElsewhere, unknown
}

// カレンダー作成用の入力
export interface CreateCalendarEventInput {
  subject: string;
  startDateTime: string; // ISO 8601
  endDateTime: string;   // ISO 8601
  timeZone?: string;
  location?: string;
  body?: string;
  attendees?: string[];  // メールアドレスの配列
  isAllDay?: boolean;
}

// カレンダー更新用の入力（全てオプショナル）
export interface UpdateCalendarEventInput {
  subject?: string;
  startDateTime?: string; // ISO 8601
  endDateTime?: string;   // ISO 8601
  timeZone?: string;
  location?: string;
  body?: string;
  attendees?: string[];   // メールアドレスの配列
  isAllDay?: boolean;
}

// ============================================
// Private RAG (Azure Blob + AI Search)
// ============================================

// Private RAG 設定
export interface PrivateRAGConfig {
  // Azure Blob Storage
  blobStorageUrl: string;        // Blob Storage URL (SAS URL推奨)
  blobContainerName: string;     // コンテナ名
  blobSasToken?: string;         // SAS Token (URLに含まれていない場合)
  
  // Azure AI Search
  searchEndpoint: string;        // AI Search エンドポイント
  searchApiKey: string;          // AI Search API キー
  searchIndexName: string;       // インデックス名
  searchIndexerName: string;     // インデクサー名
  
  // ユーザー識別
  userId: string;                // ユーザーID (メタデータ用)
}

// アップロードされたドキュメント情報
export interface PrivateRAGDocument {
  id: string;                    // doc_id (ユニーク)
  fileName: string;              // ファイル名
  fileSize: number;              // ファイルサイズ (bytes)
  mimeType: string;              // MIMEタイプ
  blobUrl: string;               // Blob URL
  uploadedAt: Date;              // アップロード日時
  userId: string;                // ユーザーID
  indexingStatus: 'pending' | 'indexing' | 'indexed' | 'failed';  // インデクシング状態
  metadata?: Record<string, string>;  // 追加メタデータ
}

// インデクサー実行結果
export interface IndexerRunResult {
  status: 'success' | 'inProgress' | 'failed';
  lastRunTime?: Date;
  itemsProcessed?: number;
  itemsFailed?: number;
  errorMessage?: string;
}

// Private RAG 検索結果
export interface PrivateRAGSearchResult {
  hasResults: boolean;
  documents: Array<{
    docId: string;
    fileName: string;
    content: string;
    score: number;
    highlights?: string[];
  }>;
  searchPerformed: boolean;
}

// ============================================
// Microsoft Teams
// ============================================

// Teamsメッセージ
export interface TeamsMessage {
  id: string;
  replyToId?: string;
  etag?: string;
  messageType: string;
  createdDateTime: string;
  lastModifiedDateTime?: string;
  deletedDateTime?: string;
  subject?: string;
  summary?: string;
  importance?: string;
  locale?: string;
  webUrl?: string;
  from?: {
    user?: {
      id: string;
      displayName: string;
      userIdentityType: string;
    };
    application?: {
      id: string;
      displayName: string;
      applicationIdentityType: string;
    };
  };
  body?: {
    contentType: string; // html, text
    content: string;
  };
  attachments?: Array<{
    id: string;
    contentType: string;
    contentUrl?: string;
    content?: string;
    name?: string;
    thumbnailUrl?: string;
  }>;
  mentions?: Array<{
    id: number;
    mentionText: string;
    mentioned: {
      user?: {
        displayName: string;
        id: string;
        userIdentityType: string;
      };
    };
  }>;
  reactions?: Array<{
    reactionType: string;
    createdDateTime: string;
    user: {
      user?: {
        displayName: string;
        id: string;
        userIdentityType: string;
      };
    };
  }>;
}

// Teamsチャネル
export interface TeamsChannel {
  id: string;
  displayName: string;
  description?: string;
  email?: string;
  webUrl?: string;
  membershipType?: string;
}

// Teamsチャット
export interface TeamsChat {
  id: string;
  topic?: string;
  createdDateTime: string;
  lastUpdatedDateTime: string;
  chatType: string; // oneOnOne, group, meeting
  webUrl?: string;
  tenantId?: string;
  members?: Array<{
    id: string;
    displayName?: string;
    userId?: string;
    email?: string;
    roles?: string[];
  }>;
}
