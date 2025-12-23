import { APIConfig, Message, ToolCall, ImageAttachment, Citation, useMaxCompletionTokens, isGPT5Model, isClaudeModel } from '@/types';
import { getOpenAITools, getGeminiTools, executeTool } from './tools';

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
  citations?: Citation[]; // RAG検索の引用情報
}

export interface SendMessageOptions {
  onChunk: (chunk: string) => void;
  onToolCall?: (toolName: string) => void;
  onToolResult?: (toolName: string, result: string) => void;
  onCitations?: (citations: Citation[]) => void; // RAG引用コールバック
  enableAgent?: boolean;
  images?: ImageAttachment[];
}

export async function sendMessage(
  messages: Message[],
  config: APIConfig,
  options: SendMessageOptions
): Promise<AgentResponse> {
  switch (config.provider) {
    case 'azure-openai':
      return sendAzureOpenAI(messages, config, options);
    case 'google-gemini':
      return sendGoogleGemini(messages, config, options);
    default:
      throw new Error('Unknown API provider');
  }
}

// Agent loop - handles tool calls automatically
export async function runAgentLoop(
  messages: Message[],
  config: APIConfig,
  options: SendMessageOptions,
  maxIterations: number = 5
): Promise<string> {
  let currentMessages = [...messages];
  let iterations = 0;
  let finalContent = '';
  
  while (iterations < maxIterations) {
    iterations++;
    
    const response = await sendMessage(currentMessages, config, {
      ...options,
      onChunk: iterations === 1 
        ? options.onChunk 
        : () => {}, // Only stream on first call
    });
    
    // If no tool calls, we're done
    if (!response.toolCalls || response.toolCalls.length === 0) {
      finalContent = response.content;
      break;
    }
    
    // Add assistant message with tool calls
    currentMessages.push({
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: response.content || '',
      timestamp: new Date(),
      toolCalls: response.toolCalls,
    });
    
    // Execute each tool and add results
    for (const toolCall of response.toolCalls) {
      const toolName = toolCall.function.name;
      options.onToolCall?.(toolName);
      
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }
      
      const result = await executeTool(toolName, args);
      options.onToolResult?.(toolName, result);
      
      // Add tool result message
      currentMessages.push({
        id: `tool-${Date.now()}-${toolCall.id}`,
        role: 'tool',
        content: result,
        timestamp: new Date(),
        toolCallId: toolCall.id,
      });
    }
  }
  
  return finalContent;
}

// RAG検索結果の型定義
interface RAGCitation {
  type: 'rag';
  title: string;
  documentId: string;
  snippet: string;
}

interface RAGSearchResult {
  hasResults: boolean;
  context: string;
  searchPerformed: boolean;
  citations: RAGCitation[];
}

// Azure AI Search からドキュメントを検索（API Route経由でCORS回避）
// セマンティック検索が失敗した場合は自動的にシンプル検索にフォールバック
async function searchAzureIndex(
  query: string,
  config: APIConfig
): Promise<RAGSearchResult> {
  if (!config.azureSearchEndpoint || !config.azureSearchApiKey || !config.azureSearchIndexName) {
    return { hasResults: false, context: '', searchPerformed: false, citations: [] };
  }

  try {
    console.log('Azure Search 検索開始:', {
      endpoint: config.azureSearchEndpoint,
      indexName: config.azureSearchIndexName,
      query: query.substring(0, 50) + '...',
    });
    
    // API Route経由で検索（CORS回避）
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchEndpoint: config.azureSearchEndpoint,
        searchApiKey: config.azureSearchApiKey,
        indexName: config.azureSearchIndexName,
        query: query,
      }),
    });

    // ドキュメントから引用情報を抽出するヘルパー関数
    const extractCitations = (docs: Array<{ chunk?: string; title?: string; content?: string; chunk_id?: string }>): RAGCitation[] => {
      return docs.map((doc) => ({
        type: 'rag' as const,
        title: doc.title || 'ドキュメント',
        documentId: doc.chunk_id || '',
        snippet: (doc.chunk || doc.content || '').substring(0, 150) + '...',
      }));
    };

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Azure Search error:', {
        status: response.status,
        error: errorData.error,
        details: errorData.details,
        suggestion: errorData.suggestion,
      });
      
      // エラーがあってもフォールバックが成功していれば結果を返す
      if (errorData._fallbackUsed && errorData.value) {
        console.log('シンプル検索へのフォールバックが成功しました');
        const docs = errorData.value as Array<{ chunk?: string; title?: string; content?: string; chunk_id?: string }>;
        const context = docs
          .map((doc, i: number) => {
            const text = doc.chunk || doc.content || '';
            const titlePart = doc.title ? `【${doc.title}】\n` : '';
            return `[${i + 1}] ${titlePart}${text}`;
          })
          .join('\n\n');
        const citations = extractCitations(docs);
        return { hasResults: context.length > 0, context, searchPerformed: true, citations };
      }
      
      return { hasResults: false, context: '', searchPerformed: true, citations: [] };
    }

    const data = await response.json();
    
    // フォールバックが使用された場合のログ
    if (data._fallbackUsed) {
      console.log('シンプル検索にフォールバックしました。元のエラー:', data._originalError);
    }
    
    if (!data.value || data.value.length === 0) {
      console.log('Azure Search: 検索結果が0件でした');
      return { hasResults: false, context: '', searchPerformed: true, citations: [] };
    }

    const docs = data.value as Array<{ chunk?: string; title?: string; content?: string; chunk_id?: string }>;
    
    // 検索結果をコンテキストとして整形（インデックスのスキーマに合わせて chunk を優先）
    const context = docs
      .map((doc, i: number) => {
        const text = doc.chunk || doc.content || '';
        const titlePart = doc.title ? `【${doc.title}】\n` : '';
        return `[${i + 1}] ${titlePart}${text}`;
      })
      .join('\n\n');
    
    // 引用情報を抽出
    const citations = extractCitations(docs);

    console.log('Azure Search 成功:', {
      resultCount: data.value.length,
      contextLength: context.length,
      citationsCount: citations.length,
    });

    return { hasResults: true, context, searchPerformed: true, citations };
  } catch (error) {
    // タイムアウトエラーの場合は特別なメッセージ
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Azure Search タイムアウト: 検索に15秒以上かかりました');
    } else {
      console.error('Azure Search error:', error);
    }
    return { hasResults: false, context: '', searchPerformed: true, citations: [] };
  }
}

// Azure Foundry Claude モデル用の送信関数
// 参照: https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/how-to/use-foundry-models-claude
// Claude は Anthropic Messages API 形式を使用 (エンドポイント: /anthropic/v1/messages)
// 正しいモデル名: claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5, claude-opus-4-1
async function sendAzureClaude(
  messages: Message[],
  config: APIConfig,
  options: SendMessageOptions
): Promise<AgentResponse> {
  if (!config.azureEndpoint || !config.azureApiKey || !config.azureDeploymentName) {
    throw new Error('Azure OpenAI / Foundry の設定が不完全です。設定画面で必要な情報を入力してください。');
  }

  // Azure Foundry Claude エンドポイント
  // 形式: https://<resource-name>.services.ai.azure.com/anthropic/v1/messages
  // 重要: Azure OpenAI (.openai.azure.com) と Azure AI Foundry (.services.ai.azure.com) は異なる
  // Claude は Azure AI Foundry でのみ利用可能
  let baseEndpoint = config.azureEndpoint.replace(/\/$/, ''); // 末尾のスラッシュを除去
  
  // .openai.azure.com → .services.ai.azure.com に変換（必要な場合）
  if (baseEndpoint.includes('.openai.azure.com')) {
    baseEndpoint = baseEndpoint.replace('.openai.azure.com', '.services.ai.azure.com');
    console.log('エンドポイントを Azure AI Foundry 形式に変換しました:', baseEndpoint);
  }
  
  // エンドポイントに /anthropic が既に含まれている場合は除去
  baseEndpoint = baseEndpoint.replace(/\/anthropic(\/.*)?$/, '');
  
  const url = `${baseEndpoint}/anthropic/v1/messages`;
  console.log('Claude API URL:', url);
  console.log('使用モデル:', config.azureDeploymentName);

  // Anthropic Messages API 形式にメッセージを変換
  const systemMessage = messages.find(m => m.role === 'system');
  const anthropicMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => {
      // ツール呼び出し結果の処理
      if (m.role === 'tool') {
        return {
          role: 'user' as const,
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: m.toolCallId,
              content: m.content,
            },
          ],
        };
      }

      // ツール呼び出しを含むアシスタントメッセージ
      if (m.toolCalls && m.toolCalls.length > 0) {
        const contentParts: Array<{type: string; text?: string; id?: string; name?: string; input?: unknown}> = [];
        if (m.content) {
          contentParts.push({ type: 'text', text: m.content });
        }
        for (const tc of m.toolCalls) {
          let args = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            args = {};
          }
          contentParts.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: args,
          });
        }
        return {
          role: 'assistant' as const,
          content: contentParts,
        };
      }

      // 画像付きユーザーメッセージ
      if (m.images && m.images.length > 0 && m.role === 'user') {
        const contentParts: Array<{type: string; text?: string; source?: {type: string; media_type: string; data: string}}> = [];
        if (m.content) {
          contentParts.push({ type: 'text', text: m.content });
        }
        for (const img of m.images) {
          if (img.url.startsWith('data:')) {
            const [header, base64Data] = img.url.split(',');
            const mimeType = header.match(/data:(.*);/)?.[1] || 'image/jpeg';
            contentParts.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Data,
              },
            });
          }
        }
        return {
          role: 'user' as const,
          content: contentParts,
        };
      }

      // 通常のメッセージ
      return {
        role: m.role as 'user' | 'assistant',
        content: m.content,
      };
    });

  // リクエストボディの構築
  const requestBody: Record<string, unknown> = {
    model: config.azureDeploymentName,
    max_tokens: 16384,
    messages: anthropicMessages,
    stream: true,
  };

  // システムプロンプトの追加
  if (systemMessage) {
    requestBody.system = systemMessage.content;
  }

  // エージェントモード時のツール追加
  if (options.enableAgent) {
    const tools = getOpenAITools();
    requestBody.tools = tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }));
  }

  console.log('Claude リクエストボディ:', JSON.stringify(requestBody, null, 2));
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.azureApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API エラー詳細:', {
      status: response.status,
      statusText: response.statusText,
      errorText,
      url,
      model: config.azureDeploymentName,
    });
    throw new Error(`Azure Claude API エラー: ${response.status} - ${errorText}`);
  }

  return processClaudeStream(response, options.onChunk);
}

// Claude ストリームレスポンスの処理
async function processClaudeStream(
  response: Response,
  onChunk: (chunk: string) => void
): Promise<AgentResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('ストリームの読み取りに失敗しました');

  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';
  const toolCalls: ToolCall[] = [];
  let currentToolUse: { id: string; name: string; arguments: string } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim() || !line.startsWith('data: ')) continue;

      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const json = JSON.parse(data);

        // content_block_start - ツール使用開始
        if (json.type === 'content_block_start' && json.content_block?.type === 'tool_use') {
          currentToolUse = {
            id: json.content_block.id,
            name: json.content_block.name,
            arguments: '',
          };
        }

        // content_block_delta - テキストまたはツール引数のデルタ
        if (json.type === 'content_block_delta') {
          if (json.delta?.type === 'text_delta' && json.delta.text) {
            fullContent += json.delta.text;
            onChunk(fullContent);
          }
          if (json.delta?.type === 'input_json_delta' && json.delta.partial_json && currentToolUse) {
            currentToolUse.arguments += json.delta.partial_json;
          }
        }

        // content_block_stop - ツール使用終了
        if (json.type === 'content_block_stop' && currentToolUse) {
          toolCalls.push({
            id: currentToolUse.id,
            type: 'function',
            function: {
              name: currentToolUse.name,
              arguments: currentToolUse.arguments,
            },
          });
          currentToolUse = null;
        }

        // message_delta - メッセージ終了情報
        if (json.type === 'message_delta') {
          // 処理完了
        }
      } catch {
        // JSON パースエラーはスキップ
      }
    }
  }

  return { content: fullContent, toolCalls };
}

async function sendAzureOpenAI(
  messages: Message[],
  config: APIConfig,
  options: SendMessageOptions
): Promise<AgentResponse> {
  if (!config.azureEndpoint || !config.azureApiKey || !config.azureDeploymentName) {
    throw new Error('Azure OpenAI の設定が不完全です。設定画面で必要な情報を入力してください。');
  }

  // Claude モデルの場合は Anthropic Messages API を使用
  // 参照: https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/how-to/use-foundry-models-claude
  if (isClaudeModel(config.azureDeploymentName)) {
    return sendAzureClaude(messages, config, options);
  }

  const url = `${config.azureEndpoint}/openai/deployments/${config.azureDeploymentName}/chat/completions?api-version=${config.azureApiVersion || '2025-04-01-preview'}`;

  // RAGが有効な場合、最後のユーザーメッセージでインデックス検索
  let ragSearchResult: RAGSearchResult = { hasResults: false, context: '', searchPerformed: false, citations: [] };
  if (config.enableRAG && config.azureSearchEndpoint && config.azureSearchApiKey && config.azureSearchIndexName) {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      ragSearchResult = await searchAzureIndex(lastUserMessage.content, config);
      // RAG検索結果の引用をコールバックで通知
      if (ragSearchResult.citations.length > 0 && options.onCitations) {
        options.onCitations(ragSearchResult.citations.map(c => ({
          type: c.type,
          title: c.title,
          documentId: c.documentId,
          snippet: c.snippet,
        })));
      }
    }
  }

  // Convert messages to OpenAI format
  const formattedMessages = messages.map((m) => {
    if (m.role === 'tool') {
      return {
        role: 'tool' as const,
        content: m.content,
        tool_call_id: m.toolCallId,
      };
    }
    
    if (m.toolCalls && m.toolCalls.length > 0) {
      return {
        role: 'assistant' as const,
        content: m.content || null,
        tool_calls: m.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      };
    }
    
    // Handle images for multimodal
    if (m.images && m.images.length > 0 && m.role === 'user') {
      return {
        role: 'user' as const,
        content: [
          { type: 'text', text: m.content },
          ...m.images.map(img => ({
            type: 'image_url' as const,
            image_url: { url: img.url },
          })),
        ],
      };
    }
    
    return {
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    };
  });

  // RAGが有効な場合のシステムプロンプト処理
  if (config.enableRAG && ragSearchResult.searchPerformed) {
    const systemIndex = formattedMessages.findIndex(m => m.role === 'system');
    
    let ragSystemPrompt: string;
    
    if (ragSearchResult.hasResults) {
      // インデックスに情報がある場合
      ragSystemPrompt = `
あなたは社内ドキュメント検索アシスタント兼Web検索エージェントです。

## ツール使用について
あなたは以下のツールを使用できます：
- web_search: インターネット検索を実行する
- calculator: 計算を実行する
- get_current_time: 現在時刻を取得する

## 回答の優先順位

### 最優先：ユーザーがWeb検索を要求した場合
以下のような要求があった場合は、**必ず web_search ツールを呼び出してください**：
- 「インターネット検索して」「Web検索して」「ネットで調べて」
- 「検索して」「調べて」「探して」
- 「〇〇について調査して」

この場合、参照ドキュメントの内容に関係なく、**即座に web_search ツールを実行**してください。

### 通常：参照ドキュメントから回答
1. 以下の「参照ドキュメント」にユーザーの質問に直接関連する情報がある場合は、その情報で回答
2. 回答の最後に、参照したドキュメント番号を明記

### 参照ドキュメントが質問に関連しない場合
1. 「社内ドキュメントには〇〇に関する情報が見つかりませんでした」と伝える
2. 「Web検索で調べましょうか？」と提案する

## 参照ドキュメント
${ragSearchResult.context}
`;
    } else {
      // インデックスに情報がない場合
      ragSystemPrompt = `
あなたは社内ドキュメント検索アシスタント兼Web検索エージェントです。

## ツール使用について
あなたは以下のツールを使用できます：
- web_search: インターネット検索を実行する
- calculator: 計算を実行する
- get_current_time: 現在時刻を取得する

## 状況
社内ドキュメント（Azure AI Search インデックス）を検索しましたが、該当する情報が見つかりませんでした。

## 回答方法
1. 「社内ドキュメントには該当する情報が見つかりませんでした。」と伝える
2. 「Web検索で調べましょうか？」と提案する

## ユーザーがWeb検索を要求した場合
以下のような要求があった場合は、**必ず web_search ツールを呼び出してください**：
- 「検索して」「調べて」「はい」「お願い」
- 「インターネット検索」「Web検索」「ネットで調べて」

**躊躇せずに web_search ツールを実行してください。**
`;
    }
    
    if (systemIndex >= 0) {
      // 既存のシステムメッセージを置き換え
      formattedMessages[systemIndex].content = ragSystemPrompt;
    } else {
      formattedMessages.unshift({
        role: 'system',
        content: ragSystemPrompt,
      });
    }
  }

  // 2025年以降のAPI or GPT-5系モデルは max_completion_tokens を使用
  const useNewTokenParam = useMaxCompletionTokens(config.azureApiVersion, config.azureDeploymentName);
  const isReasoningModel = isGPT5Model(config.azureDeploymentName);
  
  const requestBody: Record<string, unknown> = {
    messages: formattedMessages,
    stream: true,
  };

  // GPT-5 reasoning models では temperature, top_p 等はサポートされていない
  // 参照: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/reasoning
  if (!isReasoningModel) {
    requestBody.temperature = 0.7;
  }

  // 新しいAPIでは max_completion_tokens、従来は max_tokens
  if (useNewTokenParam) {
    requestBody.max_completion_tokens = 16384;
  } else {
    requestBody.max_tokens = 4096;
  }
  
  // Add tools if agent mode is enabled
  if (options.enableAgent) {
    requestBody.tools = getOpenAITools();
    requestBody.tool_choice = 'auto';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.azureApiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI API エラー: ${response.status} - ${errorText}`);
  }

  return processAzureStream(response, options.onChunk);
}

async function sendGoogleGemini(
  messages: Message[],
  config: APIConfig,
  options: SendMessageOptions
): Promise<AgentResponse> {
  if (!config.geminiApiKey) {
    throw new Error('Google Gemini API キーが設定されていません。設定画面で入力してください。');
  }

  const model = config.geminiModel || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${config.geminiApiKey}`;

  // Convert messages to Gemini format
  const contents: Array<{role: string; parts: Array<{text?: string; inlineData?: {mimeType: string; data: string}; functionCall?: {name: string; args: unknown}; functionResponse?: {name: string; response: {result: string}}}>}> = [];
  
  for (const m of messages) {
    if (m.role === 'system') continue;
    
    if (m.role === 'tool') {
      // Find the corresponding tool call
      const prevMsg = messages.find(msg => 
        msg.toolCalls?.some(tc => tc.id === m.toolCallId)
      );
      const toolCall = prevMsg?.toolCalls?.find(tc => tc.id === m.toolCallId);
      
      if (toolCall) {
        contents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: toolCall.function.name,
              response: { result: m.content },
            },
          }],
        });
      }
      continue;
    }
    
    if (m.toolCalls && m.toolCalls.length > 0) {
      contents.push({
        role: 'model',
        parts: m.toolCalls.map(tc => ({
          functionCall: {
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments || '{}'),
          },
        })),
      });
      continue;
    }
    
    const parts: Array<{text?: string; inlineData?: {mimeType: string; data: string}}> = [];
    
    if (m.content) {
      parts.push({ text: m.content });
    }
    
    // Handle images
    if (m.images && m.images.length > 0) {
      for (const img of m.images) {
        if (img.url.startsWith('data:')) {
          const [header, base64Data] = img.url.split(',');
          const mimeType = header.match(/data:(.*);/)?.[1] || 'image/jpeg';
          parts.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        }
      }
    }
    
    if (parts.length > 0) {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }
  }

  const systemMessage = messages.find((m) => m.role === 'system');
  
  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };
  
  if (systemMessage) {
    requestBody.systemInstruction = { parts: [{ text: systemMessage.content }] };
  }
  
  // Add tools if agent mode is enabled
  if (options.enableAgent) {
    requestBody.tools = getGeminiTools();
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Gemini API エラー: ${response.status} - ${errorText}`);
  }

  return processGeminiStream(response, options.onChunk);
}

async function processAzureStream(
  response: Response,
  onChunk: (chunk: string) => void
): Promise<AgentResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('ストリームの読み取りに失敗しました');

  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';
  let toolCalls: ToolCall[] = [];
  const toolCallsMap: Map<number, { id: string; name: string; arguments: string }> = new Map();
  let finishReason = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim() || !line.startsWith('data: ')) continue;
      
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      
      try {
        const json = JSON.parse(data);
        const choice = json.choices?.[0];
        
        if (choice?.finish_reason) {
          finishReason = choice.finish_reason;
        }
        
        const delta = choice?.delta;
        if (!delta) continue;
        
        // Handle content
        if (delta.content) {
          fullContent += delta.content;
          onChunk(fullContent);
        }
        
        // Handle tool calls
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const index = tc.index;
            if (!toolCallsMap.has(index)) {
              toolCallsMap.set(index, {
                id: tc.id || '',
                name: tc.function?.name || '',
                arguments: '',
              });
            }
            
            const existing = toolCallsMap.get(index)!;
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments) existing.arguments += tc.function.arguments;
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  // Convert tool calls map to array
  if (toolCallsMap.size > 0) {
    toolCalls = Array.from(toolCallsMap.values()).map(tc => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.name,
        arguments: tc.arguments,
      },
    }));
  }

  return { content: fullContent, toolCalls, finishReason };
}

async function processGeminiStream(
  response: Response,
  onChunk: (chunk: string) => void
): Promise<AgentResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('ストリームの読み取りに失敗しました');

  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';
  const toolCalls: ToolCall[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    // Gemini streams JSON objects, try to parse complete objects
    try {
      // Handle array format from Gemini
      if (buffer.trim().startsWith('[')) {
        const jsonArray = JSON.parse(buffer);
        for (const item of jsonArray) {
          const candidate = item.candidates?.[0];
          if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.text) {
                fullContent = part.text;
                onChunk(fullContent);
              }
              if (part.functionCall) {
                toolCalls.push({
                  id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  type: 'function',
                  function: {
                    name: part.functionCall.name,
                    arguments: JSON.stringify(part.functionCall.args || {}),
                  },
                });
              }
            }
          }
        }
        buffer = '';
      }
    } catch {
      // Continue accumulating buffer
    }
  }

  // Final parse attempt
  if (buffer.trim()) {
    try {
      const jsonArray = JSON.parse(buffer);
      for (const item of jsonArray) {
        const candidate = item.candidates?.[0];
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.text && !fullContent) {
              fullContent = part.text;
              onChunk(fullContent);
            }
            if (part.functionCall) {
              toolCalls.push({
                id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'function',
                function: {
                  name: part.functionCall.name,
                  arguments: JSON.stringify(part.functionCall.args || {}),
                },
              });
            }
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { content: fullContent, toolCalls };
}

export function isApiConfigured(config: APIConfig): boolean {
  switch (config.provider) {
    case 'azure-openai':
      return !!(config.azureEndpoint && config.azureApiKey && config.azureDeploymentName);
    case 'google-gemini':
      return !!config.geminiApiKey;
    default:
      return false;
  }
}
