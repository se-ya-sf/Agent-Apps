import { APIConfig, Message, ToolCall, ImageAttachment, useMaxCompletionTokens, isGPT5Model } from '@/types';
import { getOpenAITools, getGeminiTools, executeTool } from './tools';

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
}

export interface SendMessageOptions {
  onChunk: (chunk: string) => void;
  onToolCall?: (toolName: string) => void;
  onToolResult?: (toolName: string, result: string) => void;
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

// Azure AI Search からドキュメントを検索
async function searchAzureIndex(
  query: string,
  config: APIConfig
): Promise<string> {
  if (!config.azureSearchEndpoint || !config.azureSearchApiKey || !config.azureSearchIndexName) {
    return '';
  }

  try {
    const searchUrl = `${config.azureSearchEndpoint}/indexes/${config.azureSearchIndexName}/docs/search?api-version=2024-07-01`;
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.azureSearchApiKey,
      },
      body: JSON.stringify({
        search: query,
        top: 5,
        queryType: 'semantic',
        semanticConfiguration: 'default',
      }),
    });

    if (!response.ok) {
      console.error('Azure Search error:', response.status);
      return '';
    }

    const data = await response.json();
    if (!data.value || data.value.length === 0) {
      return '';
    }

    // 検索結果をコンテキストとして整形
    const context = data.value
      .map((doc: { content?: string; title?: string; chunk?: string }, i: number) => 
        `[${i + 1}] ${doc.content || doc.title || doc.chunk || ''}`
      )
      .join('\n\n');

    return context;
  } catch (error) {
    console.error('Azure Search error:', error);
    return '';
  }
}

async function sendAzureOpenAI(
  messages: Message[],
  config: APIConfig,
  options: SendMessageOptions
): Promise<AgentResponse> {
  if (!config.azureEndpoint || !config.azureApiKey || !config.azureDeploymentName) {
    throw new Error('Azure OpenAI の設定が不完全です。設定画面で必要な情報を入力してください。');
  }

  const url = `${config.azureEndpoint}/openai/deployments/${config.azureDeploymentName}/chat/completions?api-version=${config.azureApiVersion || '2025-04-01-preview'}`;

  // RAGが有効な場合、最後のユーザーメッセージでインデックス検索
  let ragContext = '';
  if (config.enableRAG && config.azureSearchEndpoint && config.azureSearchApiKey && config.azureSearchIndexName) {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      ragContext = await searchAzureIndex(lastUserMessage.content, config);
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

  // RAGコンテキストがある場合、システムメッセージに追加
  if (ragContext) {
    const systemIndex = formattedMessages.findIndex(m => m.role === 'system');
    const ragAddition = `\n\n[参照ドキュメント]\n以下のドキュメントを参考に回答してください:\n${ragContext}`;
    
    if (systemIndex >= 0) {
      formattedMessages[systemIndex].content += ragAddition;
    } else {
      formattedMessages.unshift({
        role: 'system',
        content: `あなたは親切なAIアシスタントです。${ragAddition}`,
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
