'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  Settings,
  ArrowLeft,
  FolderOpen,
  Database,
  Loader2,
  X,
  FileIcon,
  Send,
  Bot,
  User,
} from 'lucide-react';
import { uploadToBlob, validateFile, generateDocId, formatFileSize, deleteFromBlob, listBlobs } from '@/lib/blob';
import type { PrivateRAGDocument } from '@/types';

// ファイルタイプに応じたアイコン
function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
  if (mimeType.includes('text')) return '📃';
  if (mimeType.includes('json')) return '🔧';
  return '📁';
}

// ステータスバッジ
function StatusBadge({ status }: { status: PrivateRAGDocument['indexingStatus'] }) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-500 bg-yellow-50', label: '待機中' },
    indexing: { icon: RefreshCw, color: 'text-blue-500 bg-blue-50', label: 'インデクシング中' },
    indexed: { icon: CheckCircle, color: 'text-green-500 bg-green-50', label: 'インデックス済み' },
    failed: { icon: AlertCircle, color: 'text-red-500 bg-red-50', label: 'エラー' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className={`w-3 h-3 ${status === 'indexing' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
}

export default function PrivateRAGPage() {
  const { apiConfig, setApiConfig } = useStore();
  
  // State
  const [documents, setDocuments] = useState<PrivateRAGDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [indexerStatus, setIndexerStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ content: string; fileName: string; score: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Settings state
  const [localSettings, setLocalSettings] = useState({
    blobUrl: apiConfig.privateRAGBlobUrl || '',
    blobContainer: apiConfig.privateRAGBlobContainer || '',
    blobSasToken: apiConfig.privateRAGBlobSasToken || '',
    searchEndpoint: apiConfig.privateRAGSearchEndpoint || '',
    searchApiKey: apiConfig.privateRAGSearchApiKey || '',
    indexName: apiConfig.privateRAGIndexName || '',
    indexerName: apiConfig.privateRAGIndexerName || '',
    userId: apiConfig.privateRAGUserId || 'user001',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 設定が完了しているかチェック
  const isConfigured = localSettings.blobUrl && 
                       localSettings.blobContainer && 
                       localSettings.blobSasToken &&
                       localSettings.searchEndpoint && 
                       localSettings.searchApiKey &&
                       localSettings.indexName &&
                       localSettings.indexerName;

  // 設定を保存
  const handleSaveSettings = () => {
    setApiConfig({
      enablePrivateRAG: true,
      privateRAGBlobUrl: localSettings.blobUrl,
      privateRAGBlobContainer: localSettings.blobContainer,
      privateRAGBlobSasToken: localSettings.blobSasToken,
      privateRAGSearchEndpoint: localSettings.searchEndpoint,
      privateRAGSearchApiKey: localSettings.searchApiKey,
      privateRAGIndexName: localSettings.indexName,
      privateRAGIndexerName: localSettings.indexerName,
      privateRAGUserId: localSettings.userId,
    });
    setShowSettings(false);
    setSuccess('設定を保存しました');
    setTimeout(() => setSuccess(null), 3000);
  };

  // ファイルアップロード処理
  const handleUpload = useCallback(async (files: FileList | File[]) => {
    if (!isConfigured) {
      setError('先に設定を完了してください');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const fileArray = Array.from(files);
    const totalFiles = fileArray.length;
    let successCount = 0;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      // バリデーション
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(`${file.name}: ${validation.error}`);
        continue;
      }

      try {
        const docId = generateDocId();
        
        const doc = await uploadToBlob(
          file,
          {
            storageAccountUrl: localSettings.blobUrl,
            containerName: localSettings.blobContainer,
            sasToken: localSettings.blobSasToken,
          },
          localSettings.userId,
          docId,
          (progress) => {
            const overallProgress = ((i + progress / 100) / totalFiles) * 100;
            setUploadProgress(Math.round(overallProgress));
          }
        );

        setDocuments(prev => [...prev, doc]);
        successCount++;
      } catch (err) {
        setError(`${file.name}: ${err instanceof Error ? err.message : 'アップロードエラー'}`);
      }
    }

    setUploading(false);
    setUploadProgress(0);

    if (successCount > 0) {
      setSuccess(`${successCount}件のファイルをアップロードしました`);
      setTimeout(() => setSuccess(null), 3000);
      
      // インデクサーを実行
      await handleRunIndexer();
    }
  }, [isConfigured, localSettings]);

  // インデクサー実行
  const handleRunIndexer = async () => {
    if (!isConfigured) return;

    setIndexerStatus('running');
    
    try {
      const response = await fetch('/api/private-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run-indexer',
          searchEndpoint: localSettings.searchEndpoint,
          searchApiKey: localSettings.searchApiKey,
          indexerName: localSettings.indexerName,
        }),
      });

      const result = await response.json();
      
      if (result.status === 'error') {
        setError(result.message);
        setIndexerStatus('error');
      } else {
        setSuccess('インデクサーを開始しました。数分後に反映されます。');
        setTimeout(() => setSuccess(null), 5000);
        setIndexerStatus('idle');
        
        // ドキュメントのステータスを更新
        setDocuments(prev => prev.map(doc => 
          doc.indexingStatus === 'pending' ? { ...doc, indexingStatus: 'indexing' } : doc
        ));
      }
    } catch (err) {
      setError('インデクサー実行に失敗しました');
      setIndexerStatus('error');
    }
  };

  // ファイル削除
  const handleDelete = async (doc: PrivateRAGDocument) => {
    if (!confirm(`「${doc.fileName}」を削除しますか？`)) return;

    try {
      await deleteFromBlob(
        {
          storageAccountUrl: localSettings.blobUrl,
          containerName: localSettings.blobContainer,
          sasToken: localSettings.blobSasToken,
        },
        doc.userId,
        doc.id,
        doc.fileName
      );

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      setSuccess('ファイルを削除しました');
      setTimeout(() => setSuccess(null), 3000);
      
      // インデクサーを再実行して削除を反映
      await handleRunIndexer();
    } catch (err) {
      setError(`削除エラー: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  // 検索実行
  const handleSearch = async () => {
    if (!searchQuery.trim() || !isConfigured) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await fetch('/api/private-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query: searchQuery,
          searchEndpoint: localSettings.searchEndpoint,
          searchApiKey: localSettings.searchApiKey,
          indexName: localSettings.indexName,
          userId: localSettings.userId,
          top: 5,
        }),
      });

      const result = await response.json();
      
      if (result.value && result.value.length > 0) {
        setSearchResults(result.value.map((doc: Record<string, unknown>) => ({
          content: (doc.chunk as string) || '',
          fileName: (doc.title as string) || 'Unknown',
          score: (doc['@search.score'] as number) || 0,
        })));
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      setError('検索に失敗しました');
    } finally {
      setIsSearching(false);
    }
  };

  // ドラッグ＆ドロップ
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>チャットに戻る</span>
            </Link>
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-purple-600" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Private RAG
              </h1>
            </div>
          </div>
          
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>設定</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* アラート */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {!isConfigured && (
          <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl text-yellow-700 dark:text-yellow-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Private RAG を使用するには、まず設定を完了してください。</span>
            <button
              onClick={() => setShowSettings(true)}
              className="ml-auto px-3 py-1 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 transition-colors"
            >
              設定を開く
            </button>
          </div>
        )}

        {/* アップロードエリア */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center transition-all
            ${isDragging 
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
              : 'border-slate-300 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-500'
            }
            ${!isConfigured ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.md,.csv,.json"
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
            disabled={!isConfigured}
          />
          
          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 mx-auto text-purple-500 animate-spin" />
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                アップロード中... {uploadProgress}%
              </p>
              <div className="w-64 mx-auto h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                ファイルをドラッグ＆ドロップ
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                または クリックして選択
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                対応形式: PDF, Word, Excel, PowerPoint, TXT, MD, CSV, JSON（最大250MB）
              </p>
            </>
          )}
        </div>

        {/* 検索エリア */}
        {isConfigured && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-purple-500" />
              ドキュメント検索
            </h2>
            
            <div className="flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="アップロードしたドキュメント内を検索..."
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-slate-800 dark:text-white"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isSearching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                検索
              </button>
            </div>

            {/* 検索結果 */}
            {searchResults.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  検索結果 ({searchResults.length}件)
                </h3>
                {searchResults.map((result, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-purple-500" />
                      <span className="font-medium text-slate-800 dark:text-white text-sm">
                        {result.fileName}
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">
                        スコア: {result.score.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                      {result.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* アップロード済みファイル一覧 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-purple-500" />
              アップロード済みファイル ({documents.length}件)
            </h2>
            
            {documents.length > 0 && (
              <button
                onClick={handleRunIndexer}
                disabled={indexerStatus === 'running' || !isConfigured}
                className="flex items-center gap-2 px-4 py-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${indexerStatus === 'running' ? 'animate-spin' : ''}`} />
                インデクサー実行
              </button>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <FileIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>まだファイルがアップロードされていません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="text-2xl">{getFileIcon(doc.mimeType)}</span>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-white truncate">
                      {doc.fileName}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatFileSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  
                  <StatusBadge status={doc.indexingStatus} />
                  
                  <button
                    onClick={() => handleDelete(doc)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 設定モーダル */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-500">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">Private RAG 設定</h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Azure Blob Storage */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Azure Blob Storage
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                      Storage Account URL
                    </label>
                    <input
                      type="text"
                      value={localSettings.blobUrl}
                      onChange={(e) => setLocalSettings(s => ({ ...s, blobUrl: e.target.value }))}
                      placeholder="https://youraccount.blob.core.windows.net"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                      コンテナ名
                    </label>
                    <input
                      type="text"
                      value={localSettings.blobContainer}
                      onChange={(e) => setLocalSettings(s => ({ ...s, blobContainer: e.target.value }))}
                      placeholder="llmapp"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                      SAS Token
                    </label>
                    <input
                      type="password"
                      value={localSettings.blobSasToken}
                      onChange={(e) => setLocalSettings(s => ({ ...s, blobSasToken: e.target.value }))}
                      placeholder="?sv=2022-11-02&ss=b&srt=co..."
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Azure AI Search */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Azure AI Search
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                      Search エンドポイント
                    </label>
                    <input
                      type="text"
                      value={localSettings.searchEndpoint}
                      onChange={(e) => setLocalSettings(s => ({ ...s, searchEndpoint: e.target.value }))}
                      placeholder="https://yoursearch.search.windows.net"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                      API キー
                    </label>
                    <input
                      type="password"
                      value={localSettings.searchApiKey}
                      onChange={(e) => setLocalSettings(s => ({ ...s, searchApiKey: e.target.value }))}
                      placeholder="your-api-key"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                        インデックス名
                      </label>
                      <input
                        type="text"
                        value={localSettings.indexName}
                        onChange={(e) => setLocalSettings(s => ({ ...s, indexName: e.target.value }))}
                        placeholder="private-rag-index"
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                        インデクサー名
                      </label>
                      <input
                        type="text"
                        value={localSettings.indexerName}
                        onChange={(e) => setLocalSettings(s => ({ ...s, indexerName: e.target.value }))}
                        placeholder="private-rag-indexer"
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ユーザーID */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  ユーザー設定
                </h3>
                
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    ユーザーID（メタデータ用）
                  </label>
                  <input
                    type="text"
                    value={localSettings.userId}
                    onChange={(e) => setLocalSettings(s => ({ ...s, userId: e.target.value }))}
                    placeholder="user001"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Blobメタデータに user_id として保存されます
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
