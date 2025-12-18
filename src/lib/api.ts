import { APIConfig, Message } from '@/types';

export async function sendMessage(
  messages: Message[],
  config: APIConfig,
  onChunk: (chunk: string) => void
): Promise<string> {
  if (config.provider === 'azure-openai') {
    return sendAzureOpenAI(messages, config, onChunk);
  } else if (config.provider === 'google-gemini') {
    return sendGoogleGemini(messages, config, onChunk);
  }
  throw new Error('Unknown API provider');
}

async function sendAzureOpenAI(
  messages: Message[],
  config: APIConfig,
  onChunk: (chunk: string) => void
): Promise<string> {
  if (!config.azureEndpoint || !config.azureApiKey || !config.azureDeploymentName) {
    throw new Error('Azure OpenAI の設定が不完全です。設定画面で必要な情報を入力してください。');
  }

  const url = `${config.azureEndpoint}/openai/deployments/${config.azureDeploymentName}/chat/completions?api-version=${config.azureApiVersion || '2024-02-15-preview'}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.azureApiKey,
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI API エラー: ${response.status} - ${errorText}`);
  }

  return processStream(response, onChunk, 'azure');
}

async function sendGoogleGemini(
  messages: Message[],
  config: APIConfig,
  onChunk: (chunk: string) => void
): Promise<string> {
  if (!config.geminiApiKey) {
    throw new Error('Google Gemini API キーが設定されていません。設定画面で入力してください。');
  }

  const model = config.geminiModel || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${config.geminiApiKey}`;

  // Convert messages to Gemini format
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemMessage = messages.find((m) => m.role === 'system');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      systemInstruction: systemMessage 
        ? { parts: [{ text: systemMessage.content }] }
        : undefined,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Gemini API エラー: ${response.status} - ${errorText}`);
  }

  return processStream(response, onChunk, 'gemini');
}

async function processStream(
  response: Response,
  onChunk: (chunk: string) => void,
  provider: 'azure' | 'gemini'
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('ストリームの読み取りに失敗しました');

  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      if (provider === 'azure') {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              onChunk(fullContent);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      } else if (provider === 'gemini') {
        try {
          // Gemini returns JSON array for streaming
          const json = JSON.parse(line);
          const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            fullContent += content;
            onChunk(fullContent);
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  return fullContent;
}

export function isApiConfigured(config: APIConfig): boolean {
  if (config.provider === 'azure-openai') {
    return !!(config.azureEndpoint && config.azureApiKey && config.azureDeploymentName);
  } else if (config.provider === 'google-gemini') {
    return !!config.geminiApiKey;
  }
  return false;
}
