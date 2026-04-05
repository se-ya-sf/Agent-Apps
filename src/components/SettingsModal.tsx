'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { 
  APIProvider, 
  SearchProvider, 
  GEMINI_MODELS, 
  AZURE_OPENAI_API_VERSIONS,
  AZURE_DEPLOYMENT_EXAMPLES,
  isGPT5Model,
  isClaudeModel,
  isGrokModel,
  isDeepSeekModel,
  isV1Api
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
  Info,
  Calendar,
  LogIn,
  LogOut,
  User,
  MessageSquare
} from 'lucide-react';

export default function SettingsModal() {
  const { isSettingsOpen, toggleSettings, apiConfig, setApiConfig } = useStore();
  
  const [localConfig, setLocalConfig] = useState(apiConfig);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  
  // Microsoft/Outlook認証状態
  const [msftAuthStatus, setMsftAuthStatus] = useState<'idle' | 'signing-in' | 'signed-in' | 'error'>('idle');
  const [msftUserName, setMsftUserName] = useState<string | null>(null);

  useEffect(() => {
    setLocalConfig(apiConfig);
  }, [apiConfig, isSettingsOpen]);

  // Microsoft認証状態の確認
  useEffect(() => {
    const checkMsftAuth = async () => {
      if ((localConfig.enableOutlook || localConfig.enableTeams) && localConfig.microsoftClientId && localConfig.microsoftTenantId) {
        try {
          const { initializeMsal, getCurrentAccount, getUserProfile, isSignedIn } = await import('@/lib/outlook');
          await initializeMsal(localConfig.microsoftClientId, localConfig.microsoftTenantId);
          
          if (isSignedIn()) {
            const account = getCurrentAccount();
            if (account) {
              setMsftAuthStatus('signed-in');
              try {
                const profile = await getUserProfile();
                setMsftUserName(profile.displayName || account.username);
              } catch {
                setMsftUserName(account.username);
              }
            }
          }
        } catch (error) {
          console.error('MSAL init error:', error);
        }
      }
    };
    checkMsftAuth();
  }, [localConfig.enableOutlook, localConfig.enableTeams, localConfig.microsoftClientId, localConfig.microsoftTenantId]);

  // Microsoftサインイン
  const handleMsftSignIn = async () => {
    if (!localConfig.microsoftClientId || !localConfig.microsoftTenantId) {
      alert('Client ID と Tenant ID を入力してください');
      return;
    }
    
    setMsftAuthStatus('signing-in');
    try {
      const { initializeMsal, signInWithMicrosoft, getUserProfile } = await import('@/lib/outlook');
      await initializeMsal(localConfig.microsoftClientId, localConfig.microsoftTenantId);
      const account = await signInWithMicrosoft();
      
      if (account) {
        setMsftAuthStatus('signed-in');
        try {
          const profile = await getUserProfile();
          setMsftUserName(profile.displayName || account.username);
        } catch {
          setMsftUserName(account.username);
        }
      }
    } catch (error) {
      console.error('Microsoft sign-in error:', error);
      setMsftAuthStatus('error');
      alert(`サインインエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Microsoftサインアウト
  const handleMsftSignOut = async () => {
    try {
      const { signOutFromMicrosoft } = await import('@/lib/outlook');
      await signOutFromMicrosoft();
      setMsftAuthStatus('idle');
      setMsftUserName(null);
    } catch (error) {
      console.error('Microsoft sign-out error:', error);
    }
  };

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

        // Claudeモデルの場合はAnthropic APIでテスト
        const isClaude = isClaudeModel(localConfig.azureDeploymentName);
        const useV1 = isV1Api(localConfig.azureApiVersion) || isGrokModel(localConfig.azureDeploymentName) || isDeepSeekModel(localConfig.azureDeploymentName);
        const isGPT5 = isGPT5Model(localConfig.azureDeploymentName);
        
        let testUrl: string;
        let testBody: Record<string, unknown>;
        let testHeaders: Record<string, string>;
        
        if (isClaude) {
          // Claude: Anthropic Messages API
          let baseEp = localConfig.azureEndpoint!.replace(/\/$/, '');
          if (baseEp.includes('.openai.azure.com')) {
            baseEp = baseEp.replace('.openai.azure.com', '.services.ai.azure.com');
          }
          baseEp = baseEp.replace(/\/anthropic(\/.*)?$/, '');
          testUrl = `${baseEp}/anthropic/v1/messages`;
          testBody = {
            model: localConfig.azureDeploymentName,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hello' }],
          };
          testHeaders = {
            'Content-Type': 'application/json',
            'api-key': localConfig.azureApiKey!,
            'anthropic-version': '2024-06-01',
          };
        } else if (useV1) {
          // v1 API
          testUrl = `${localConfig.azureEndpoint!.replace(/\/$/, '')}/openai/v1/chat/completions`;
          testBody = {
            model: localConfig.azureDeploymentName,
            messages: [{ role: 'user', content: 'Hello' }],
            max_completion_tokens: 50,
          };
          testHeaders = {
            'Content-Type': 'application/json',
            'api-key': localConfig.azureApiKey!,
          };
        } else {
          // レガシーAPI
          testUrl = `${localConfig.azureEndpoint}/openai/deployments/${localConfig.azureDeploymentName}/chat/completions?api-version=${localConfig.azureApiVersion || '2025-04-01-preview'}`;
          testBody = {
            messages: [{ role: 'user', content: 'Hello' }],
          };
          if (isGPT5) {
            testBody.max_completion_tokens = 50;
          } else {
            testBody.max_tokens = 10;
          }
          testHeaders = {
            'Content-Type': 'application/json',
            'api-key': localConfig.azureApiKey!,
          };
        }

        const response = await fetch(testUrl, {
          method: 'POST',
          headers: testHeaders,
          body: JSON.stringify(testBody),
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

        const model = localConfig.geminiModel || 'gemini-2.0-flash';
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
                  GPT-5.2 / Claude 4.6 / Grok 4 / DeepSeek
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
                  Gemini 2.5 Pro / 2.0 Flash / 1.5
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
                  href="https://ai.azure.com/catalog/models" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-purple-500 underline"
                >
                  Microsoft Foundry モデルカタログ
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
                  placeholder="https://your-resource.openai.azure.com または .services.ai.azure.com"
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
                
                {/* Claude + Model Router 警告 */}
                {isClaudeModel(localConfig.azureDeploymentName) && localConfig.azureEndpoint?.includes('modelrouter') && (
                  <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-red-700 dark:text-red-300">
                        <p className="font-bold">Model Router では Claude Sonnet 4.6 / Opus 4.6 は非対応です</p>
                        <p className="mt-1">Claude モデルを使用するには、Claude 専用のデプロイメントを作成し、そのエンドポイントを使用してください。</p>
                        <p className="mt-1">対応リージョン: <strong>East US 2</strong> / <strong>Sweden Central</strong></p>
                        <p className="mt-1">形式: <code className="bg-red-100 dark:bg-red-800 px-1 rounded">https://&lt;resource&gt;.services.ai.azure.com</code></p>
                      </div>
                    </div>
                  </div>
                )}

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
                  value={localConfig.azureApiVersion || 'v1'}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, azureApiVersion: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white"
                >
                  {AZURE_OPENAI_API_VERSIONS.map((version) => (
                    <option key={version} value={version}>
                      {version === 'v1' ? 'v1 (GA - 推奨、api-version不要)' : 
                       version === 'v1-preview' ? 'v1-preview (最新プレビュー機能)' : 
                       version}
                    </option>
                  ))}
                </select>
                {isV1Api(localConfig.azureApiVersion) && (
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      v1 API: /openai/v1/ パスを使用。Grok・DeepSeek等の他プロバイダーモデルも対応。
                    </p>
                  </div>
                )}
                {isClaudeModel(localConfig.azureDeploymentName) && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Claudeモデル: 自動的に Anthropic Messages API (/anthropic/v1/messages) を使用します。
                    </p>
                  </div>
                )}
                {(isGrokModel(localConfig.azureDeploymentName) || isDeepSeekModel(localConfig.azureDeploymentName)) && !isV1Api(localConfig.azureApiVersion) && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Grok/DeepSeekモデルは自動的にv1 APIを使用します。
                    </p>
                  </div>
                )}
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
                  value={localConfig.geminiModel || 'gemini-2.0-flash'}
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

          {/* Microsoft / Outlook Calendar Integration */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Microsoft 365 連携 (Outlook カレンダー)
            </label>
            <button
              onClick={() => setLocalConfig((prev) => ({ ...prev, enableOutlook: !prev.enableOutlook }))}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all
                ${localConfig.enableOutlook
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center
                ${localConfig.enableOutlook 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }
              `}>
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${localConfig.enableOutlook ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>
                    Outlook カレンダー連携
                  </span>
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${localConfig.enableOutlook 
                      ? 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }
                  `}>
                    {localConfig.enableOutlook ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Microsoft Graph API でカレンダー予定の参照・作成
                </p>
              </div>
            </button>
          </div>

          {/* Microsoft Teams Integration */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Microsoft Teams 連携
            </label>
            <button
              onClick={() => setLocalConfig((prev) => ({ ...prev, enableTeams: !prev.enableTeams }))}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all
                ${localConfig.enableTeams
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center
                ${localConfig.enableTeams 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }
              `}>
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${localConfig.enableTeams ? 'text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400'}`}>
                    Teams チャネルメッセージ検索
                  </span>
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${localConfig.enableTeams 
                      ? 'bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }
                  `}>
                    {localConfig.enableTeams ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  チャネルメッセージ、スレッド検索（プライベートチャット除外）
                </p>
              </div>
            </button>
          </div>

          {/* Microsoft Configuration */}
          {(localConfig.enableOutlook || localConfig.enableTeams) && (
            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <ExternalLink className="w-4 h-4" />
                <a 
                  href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-500 underline"
                >
                  Azure Entra ID でアプリを登録
                </a>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Key className="w-4 h-4" />
                  Client ID (Application ID)
                </label>
                <input
                  type="text"
                  value={localConfig.microsoftClientId || ''}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, microsoftClientId: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Server className="w-4 h-4" />
                  Tenant ID (Directory ID)
                </label>
                <input
                  type="text"
                  value={localConfig.microsoftTenantId || ''}
                  onChange={(e) => setLocalConfig((prev) => ({ ...prev, microsoftTenantId: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* Microsoft Sign-in Status */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                {msftAuthStatus === 'signed-in' ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                          サインイン済み
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {msftUserName || 'Microsoft Account'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleMsftSignOut}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      サインアウト
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleMsftSignIn}
                    disabled={msftAuthStatus === 'signing-in' || !localConfig.microsoftClientId || !localConfig.microsoftTenantId}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    {msftAuthStatus === 'signing-in' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        サインイン中...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        Microsoft でサインイン
                      </>
                    )}
                  </button>
                )}
                
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">必要な API 権限:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
                        <li>User.Read（プロフィール読み取り）</li>
                        {localConfig.enableOutlook && (
                          <>
                            <li>Calendars.Read（予定の参照）</li>
                            <li>Calendars.ReadWrite（予定の作成）</li>
                          </>
                        )}
                        {localConfig.enableTeams && (
                          <>
                            <li>Team.ReadBasic.All（チーム情報の読み取り）</li>
                            <li>Channel.ReadBasic.All（チャネル情報の読み取り）</li>
                            <li>ChannelMessage.Read.All（チャネルメッセージの読み取り）</li>
                          </>
                        )}
                      </ul>
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                        ※ Teams連携はチャネルメッセージのみで、プライベートチャットは対象外です
                      </p>
                      <p className="mt-2">
                        リダイレクト URI: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}</code>
                      </p>
                    </div>
                  </div>
                </div>
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
