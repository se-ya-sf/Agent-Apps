'use client';

import type { IndexerRunResult, PrivateRAGSearchResult } from '@/types';

// AI Search 設定インターフェース
interface SearchConfig {
  endpoint: string;      // https://<service>.search.windows.net
  apiKey: string;        // Admin API Key
  indexName: string;     // インデックス名
  indexerName: string;   // インデクサー名
}

// API バージョン
const API_VERSION = '2024-07-01';

/**
 * インデクサーを実行（手動トリガー）
 * Blob にファイルがアップロードされた後に呼び出す
 */
export async function runIndexer(config: SearchConfig): Promise<IndexerRunResult> {
  const url = `${config.endpoint}/indexers/${config.indexerName}/run?api-version=${API_VERSION}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
    });

    if (response.status === 202) {
      // 202 Accepted = インデクサー実行開始
      return {
        status: 'inProgress',
        lastRunTime: new Date(),
      };
    } else if (response.status === 409) {
      // 409 Conflict = インデクサーが既に実行中
      return {
        status: 'inProgress',
        errorMessage: 'インデクサーは既に実行中です',
      };
    } else {
      const errorText = await response.text();
      return {
        status: 'failed',
        errorMessage: `インデクサー実行エラー: ${response.status} - ${errorText}`,
      };
    }
  } catch (error) {
    return {
      status: 'failed',
      errorMessage: `ネットワークエラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * インデクサーのステータスを取得
 */
export async function getIndexerStatus(config: SearchConfig): Promise<IndexerRunResult> {
  const url = `${config.endpoint}/indexers/${config.indexerName}/status?api-version=${API_VERSION}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        status: 'failed',
        errorMessage: `ステータス取得エラー: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    const lastResult = data.lastResult;
    
    if (!lastResult) {
      return {
        status: 'success',
        itemsProcessed: 0,
        itemsFailed: 0,
      };
    }

    // ステータスをマッピング
    let status: 'success' | 'inProgress' | 'failed' = 'success';
    if (lastResult.status === 'inProgress') {
      status = 'inProgress';
    } else if (lastResult.status === 'transientFailure' || lastResult.status === 'persistentFailure') {
      status = 'failed';
    }

    return {
      status,
      lastRunTime: lastResult.endTime ? new Date(lastResult.endTime) : undefined,
      itemsProcessed: lastResult.itemsProcessed || 0,
      itemsFailed: lastResult.itemsFailed || 0,
      errorMessage: lastResult.errorMessage,
    };
  } catch (error) {
    return {
      status: 'failed',
      errorMessage: `ネットワークエラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Private RAG インデックスを検索
 */
export async function searchPrivateRAG(
  query: string,
  config: SearchConfig,
  userId?: string,
  top: number = 5
): Promise<PrivateRAGSearchResult> {
  const url = `${config.endpoint}/indexes/${config.indexName}/docs/search?api-version=${API_VERSION}`;
  
  try {
    // 検索リクエストボディ
    const searchBody: Record<string, unknown> = {
      search: query,
      top: top,
      queryType: 'simple',
      searchMode: 'any',
      select: 'chunk_id,chunk,title,parent_id,doc_id,user_id',
      searchFields: 'chunk,title',
      highlight: 'chunk',
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
    };

    // ユーザーIDでフィルタ（指定された場合）
    if (userId) {
      searchBody.filter = `user_id eq '${userId}'`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Private RAG 検索エラー:', errorText);
      return {
        hasResults: false,
        documents: [],
        searchPerformed: true,
      };
    }

    const data = await response.json();
    const results = data.value || [];

    if (results.length === 0) {
      return {
        hasResults: false,
        documents: [],
        searchPerformed: true,
      };
    }

    // 結果を整形
    const documents = results.map((doc: Record<string, unknown>) => ({
      docId: (doc.doc_id as string) || (doc.chunk_id as string) || '',
      fileName: (doc.title as string) || 'Unknown',
      content: (doc.chunk as string) || '',
      score: (doc['@search.score'] as number) || 0,
      highlights: doc['@search.highlights']?.chunk as string[] | undefined,
    }));

    return {
      hasResults: true,
      documents,
      searchPerformed: true,
    };
  } catch (error) {
    console.error('Private RAG 検索例外:', error);
    return {
      hasResults: false,
      documents: [],
      searchPerformed: true,
    };
  }
}

/**
 * インデックスのドキュメント数を取得
 */
export async function getIndexDocumentCount(config: SearchConfig, userId?: string): Promise<number> {
  const url = `${config.endpoint}/indexes/${config.indexName}/docs/$count?api-version=${API_VERSION}`;
  
  try {
    // フィルタ付きでカウント
    if (userId) {
      const searchUrl = `${config.endpoint}/indexes/${config.indexName}/docs/search?api-version=${API_VERSION}`;
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.apiKey,
        },
        body: JSON.stringify({
          search: '*',
          filter: `user_id eq '${userId}'`,
          top: 0,
          count: true,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data['@odata.count'] || 0;
      }
    } else {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'api-key': config.apiKey,
        },
      });
      
      if (response.ok) {
        const count = await response.text();
        return parseInt(count, 10) || 0;
      }
    }
    
    return 0;
  } catch (error) {
    console.error('ドキュメント数取得エラー:', error);
    return 0;
  }
}

/**
 * インデックスから特定のドキュメントを削除
 * ※ Azure AI Search では直接削除はできないため、Blob を削除してインデクサーを再実行する必要がある
 */
export async function deleteDocumentFromIndex(
  config: SearchConfig,
  docId: string
): Promise<{ success: boolean; message: string }> {
  // Azure AI Search の Blob インデクサーは、Blob が削除されると
  // 次回のインデクサー実行時に自動的にインデックスからも削除される
  // ここでは手動でインデクサーを実行
  const result = await runIndexer(config);
  
  if (result.status === 'failed') {
    return {
      success: false,
      message: result.errorMessage || 'インデクサー実行に失敗しました',
    };
  }
  
  return {
    success: true,
    message: 'ドキュメント削除をスケジュールしました。インデクサー実行後に反映されます。',
  };
}

/**
 * Private RAG の検索結果を LLM 向けにフォーマット
 */
export function formatSearchResultsForLLM(results: PrivateRAGSearchResult): string {
  if (!results.hasResults || results.documents.length === 0) {
    return 'アップロードされたドキュメントには該当する情報が見つかりませんでした。';
  }

  return results.documents.map((doc, index) => {
    const content = doc.highlights?.[0] || doc.content;
    // HTMLタグを除去
    const cleanContent = content.replace(/<[^>]*>/g, '');
    return `[${index + 1}] 【${doc.fileName}】\n${cleanContent.substring(0, 500)}${cleanContent.length > 500 ? '...' : ''}`;
  }).join('\n\n');
}
