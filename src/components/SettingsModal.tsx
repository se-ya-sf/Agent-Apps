'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { 
  APIProvider, 
  SearchProvider, 
  GEMINI_MODELS, 
  AZURE_OPENAI_API_VERSIONS,
  AZURE_DEPLOYMENT_EXAMPLES,
  isGPT5Model
} from '@/types';
import { 
  X, 
  Settings, 
  Cloud, 
  Key,
  Server,
  Zap,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Bot,
  Search,
  Calculator,
  Clock,
  Eye,
  Globe,
  Database,
  Info
} from 'lucide-react';

export default function SettingsModal() {
  const { isSettingsOpen, toggleSettings, apiConfig, setApiConfig } = useStore();
  
  const [localConfig, setLocalConfig] = useState(apiConfig);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    setLocalConfig(apiConfig);
  }, [apiConfig, isSettingsOpen]);

  const handleProviderChange = (provider: APIProvider) => {
    setLocalConfig((prev) => ({ ...prev, provider }));
    setTestStatus('idle');
    setTestMessage('');
  };

  const handleSave = () => {
    setApiConfig(localConfig);
    toggleSettings();
  };

  const handleTest = async () => {
    setTestStatus('testing');
    setTestMessage('');

    try {
      if (localConfig.provider === 'azure-openai') {
        if (!localConfig.azureEndpoint || !localConfig.azureApiKey || !localConfig.azureDeploymentName) {
          throw new Error('必須項目を入力してください');
        }

        const url = `${localConfig.azureEndpoint}/openai/deployments/${localConfig.azureDeploymentName}/chat/completions?api-version=${localConfig.azureApiVersion || '2025-04-01-preview'}`;
        
        // GPT-5系モデルかどうかを判定（max_tokensがサポートされていない）
        const isGPT5 = isGPT5Model(localConfig.azureDeploymentName);
        
        // リクエストボディの構築
        const requestBody: Record<string, unknown> = {
          messages: [{ role: 'user', content: 'Hello' }],
        };
        
        // GPT-5系では max_completion_tokens、それ以外は max_tokens
        if (isGPT5) {
          requestBody.max_completion_tokens = 50;
        } else {
          requestBody.max_tokens = 10;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': localConfig.azureApiKey,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`API Error: ${response.status} - ${errorData}`);
        }

        setTestStatus('success');
        setTestMessage('接続成功!');
      } else if (localConfig.provider === 'google-gemini') {
        if (!localConfig.geminiApiKey) {
          throw new Error('API キーを入力してください');
        }

        const model = localConfig.geminiModel || 'gemini-2.0-flash-exp';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${localConfig.geminiApiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`API Error: ${response.status} - ${errorData}`);
        }

        setTestStatus('success');
        setTestMessage('接続成功!');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(error instanceof Error ? error.message : '接続に失敗しました');
    }
  };

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={toggleSettings}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-500">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">設定</h2>
          </div>
          <button
            onClick={toggleSettings}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Provider Selection - 2つに簡素化 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              LLM プロバイダー
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleProviderChange('azure-openai')}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                  ${localConfig.provider === 'azure-openai'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                  }
                `}
              >
                <Cloud className={`w-8 h-8 ${localConfig.provider === 'azure-openai' ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${localConfig.provider === 'azure-openai' ? 'text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400'}`}>
                  Azure OpenAI
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  GPT-4o / GPT-5 / Claude / Grok
                </span>
              </button>
              <button
                onClick={() => handleProviderChange('google-gemini')}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                  ${localConfig.provider === 'google-gemini'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                  }
                `}
              >
                <Zap className={`w-8 h-8 ${localConfig.provider === 'google-gemini' ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${localConfig.provider === 'google-gemini' ? 'text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400'}`}>
                  Google Gemini
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Gemini 2.0 / 2.5 / 1.5
                </span>
              </button>
            </div>
          </div>

          {/* Azure OpenAI Config */}
          {localConfig.provider === 'azure-openai' && (
            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <ExternalLink className="w-4 h-4" />
                <a 
                  href="https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/OpenAI" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-purple-500 underline"
                >
                  Azure Portal で OpenAI を作成
                </a>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Server className="w-4 h-4" />
                  エンドポイント URL
                </label>
                <input
                  type="text"
                  value={localConfig.azureEndpoint || ''}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, azureEndpoint: e.target.value }))}
                  placeholder="https://your-resource.openai.azure.com"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Key className="w-4 h-4" />
                  API キー
                </label>
                <input
                  type="password"
                  value={localConfig.azureApiKey || ''}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, azureApiKey: e.target.value }))}
                  placeholder="your-api-key"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  デプロイメント名
                </label>
                <input
                  type="text"
                  value={localConfig.azureDeploymentName || ''}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, azureDeploymentName: e.target.value }))}
                  placeholder="デプロイメント名を入力"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                />
                
                {/* デプロイメント名の例 */}
                <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">利用可能なモデル例</span>
                  </div>
                  <div className="space-y-2">
                    {AZURE_DEPLOYMENT_EXAMPLES.map((group) => (
                      <div key={group.category} className="flex flex-wrap gap-1 items-center">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">{group.category}:</span>
                        {group.examples.map((example) => (
                          <button
                            key={example}
                            onClick={() => setLocalConfig((prev) => ({ ...prev, azureDeploymentName: example }))}
                            className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  API バージョン
                </label>
                <select
                  value={localConfig.azureApiVersion || '2025-04-01-preview'}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, azureApiVersion: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white"
                >
                  {AZURE_OPENAI_API_VERSIONS.map((version) => (
                    <option key={version} value={version}>{version}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Google Gemini Config */}
          {localConfig.provider === 'google-gemini' && (
            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <ExternalLink className="w-4 h-4" />
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-purple-500 underline"
                >
                  Google AI Studio で API キーを取得
                </a>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Key className="w-4 h-4" />
                  API キー
                </label>
                <input
                  type="password"
                  value={localConfig.geminiApiKey || ''}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, geminiApiKey: e.target.value }))}
                  placeholder="your-gemini-api-key"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  モデル
                </label>
                <select
                  value={localConfig.geminiModel || 'gemini-2.0-flash-exp'}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, geminiModel: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white"
                >
                  {GEMINI_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label} - {model.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Agent Mode Toggle */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              エージェントモード
            </label>
            <button
              onClick={() => setLocalConfig((prev) => ({ ...prev, enableAgent: !prev.enableAgent }))}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all
                ${localConfig.enableAgent
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center
                ${localConfig.enableAgent 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }
              `}>
                <Bot className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${localConfig.enableAgent ? 'text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400'}`}>
                    エージェント機能を有効化
                  </span>
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${localConfig.enableAgent 
                      ? 'bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }
                  `}>
                    {localConfig.enableAgent ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Web検索、計算、画像分析などのツールを使用できます
                </p>
              </div>
            </button>
          </div>

          {/* Search API Settings (only shown when agent is enabled) */}
          {localConfig.enableAgent && (
            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-500" />
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  検索API設定
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">
                  検索プロバイダー
                </label>
                <select
                  value={localConfig.searchProvider || 'duckduckgo'}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, searchProvider: e.target.value as SearchProvider }))}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white"
                >
                  <option value="duckduckgo">DuckDuckGo (無料・APIキー不要)</option>
                  <option value="tavily">Tavily (AI向け最適化・無料枠あり)</option>
                  <option value="brave">Brave Search (高品質・無料枠あり)</option>
                </select>
              </div>

              {localConfig.searchProvider === 'tavily' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Key className="w-4 h-4" />
                      Tavily API キー
                    </label>
                    <a 
                      href="https://tavily.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-purple-500 hover:text-purple-600 underline"
                    >
                      キーを取得
                    </a>
                  </div>
                  <input
                    type="password"
                    value={localConfig.tavilyApiKey || ''}
                    onChange={(e) => setLocalConfig((prev) => ({ ...prev, tavilyApiKey: e.target.value }))}
                    placeholder="tvly-..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                  />
                  <p className="text-xs text-slate-500">無料プランで月1,000回まで検索可能</p>
                </div>
              )}

              {localConfig.searchProvider === 'brave' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Key className="w-4 h-4" />
                      Brave Search API キー
                    </label>
                    <a 
                      href="https://brave.com/search/api/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-purple-500 hover:text-purple-600 underline"
                    >
                      キーを取得
                    </a>
                  </div>
                  <input
                    type="password"
                    value={localConfig.braveApiKey || ''}
                    onChange={(e) => setLocalConfig((prev) => ({ ...prev, braveApiKey: e.target.value }))}
                    placeholder="BSA..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                  />
                  <p className="text-xs text-slate-500">無料プランで月2,000回まで検索可能</p>
                </div>
              )}

              {/* Tool List */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
                  <Search className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">Web検索</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
                  <Calculator className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">計算機</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">現在時刻</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
                  <Eye className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">画像分析</span>
                </div>
              </div>
            </div>
          )}

          {/* RAG Settings (Azure AI Search) */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              RAG機能 (Azure AI Search)
            </label>
            <button
              onClick={() => setLocalConfig((prev) => ({ ...prev, enableRAG: !prev.enableRAG }))}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all
                ${localConfig.enableRAG
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center
                ${localConfig.enableRAG 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }
              `}>
                <Database className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${localConfig.enableRAG ? 'text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400'}`}>
                    RAG機能を有効化
                  </span>
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${localConfig.enableRAG 
                      ? 'bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }
                  `}>
                    {localConfig.enableRAG ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Azure AI Search のインデックスを使用して回答を生成
                </p>
              </div>
            </button>
          </div>

          {/* RAG Configuration */}
          {localConfig.enableRAG && (
            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <ExternalLink className="w-4 h-4" />
                <a 
                  href="https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/CognitiveSearch" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-purple-500 underline"
                >
                  Azure Portal で AI Search を作成
                </a>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Server className="w-4 h-4" />
                  Search エンドポイント
                </label>
                <input
                  type="text"
                  value={localConfig.azureSearchEndpoint || ''}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, azureSearchEndpoint: e.target.value }))}
                  placeholder="https://your-search.search.windows.net"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Key className="w-4 h-4" />
                  Search API キー
                </label>
                <input
                  type="password"
                  value={localConfig.azureSearchApiKey || ''}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, azureSearchApiKey: e.target.value }))}
                  placeholder="your-search-api-key"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Database className="w-4 h-4" />
                  インデックス名
                </label>
                <input
                  type="text"
                  value={localConfig.azureSearchIndexName || ''}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, azureSearchIndexName: e.target.value }))}
                  placeholder="your-index-name"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  事前に Azure AI Search でインデックスを作成しておいてください
                </p>
              </div>
            </div>
          )}

          {/* Test Status */}
          {testStatus !== 'idle' && (
            <div className={`
              flex items-center gap-2 p-3 rounded-lg
              ${testStatus === 'testing' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}
              ${testStatus === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : ''}
              ${testStatus === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : ''}
            `}>
              {testStatus === 'testing' && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              {testStatus === 'success' && <CheckCircle className="w-4 h-4" />}
              {testStatus === 'error' && <AlertCircle className="w-4 h-4" />}
              <span className="text-sm font-medium">{testMessage || 'テスト中...'}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleTest}
            disabled={testStatus === 'testing'}
            className="px-4 py-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            接続テスト
          </button>
          <div className="flex gap-3">
            <button
              onClick={toggleSettings}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
