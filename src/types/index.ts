export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export type APIProvider = 'azure-openai' | 'google-gemini';

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
}

export interface AppSettings {
  apiConfig: APIConfig;
  theme: 'light' | 'dark' | 'system';
}
