import { NextRequest, NextResponse } from 'next/server';

// API バージョン
const SEARCH_API_VERSION = '2024-07-01';

/**
 * Private RAG API
 * - POST: 検索 or インデクサー実行
 * - GET: インデクサーステータス取得
 */

// インデクサーを実行
async function runIndexer(
  searchEndpoint: string,
  searchApiKey: string,
  indexerName: string
): Promise<{ status: string; message: string }> {
  const url = `${searchEndpoint}/indexers/${indexerName}/run?api-version=${SEARCH_API_VERSION}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': searchApiKey,
      },
    });

    if (response.status === 202) {
      return { status: 'started', message: 'インデクサーを開始しました' };
    } else if (response.status === 409) {
      return { status: 'running', message: 'インデクサーは既に実行中です' };
    } else {
      const errorText = await response.text();
      return { status: 'error', message: `エラー: ${response.status} - ${errorText}` };
    }
  } catch (error) {
    return { status: 'error', message: `ネットワークエラー: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}

// インデクサーステータスを取得
async function getIndexerStatus(
  searchEndpoint: string,
  searchApiKey: string,
  indexerName: string
): Promise<Record<string, unknown>> {
  const url = `${searchEndpoint}/indexers/${indexerName}/status?api-version=${SEARCH_API_VERSION}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'api-key': searchApiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`ステータス取得エラー: ${response.status}`);
  }

  return response.json();
}

// Private RAG 検索
async function searchPrivateRAG(
  query: string,
  searchEndpoint: string,
  searchApiKey: string,
  indexName: string,
  userId?: string,
  top: number = 5
): Promise<Record<string, unknown>> {
  const url = `${searchEndpoint}/indexes/${indexName}/docs/search?api-version=${SEARCH_API_VERSION}`;
  
  const searchBody: Record<string, unknown> = {
    search: query,
    top: top,
    queryType: 'simple',
    searchMode: 'any',
    select: 'chunk_id,chunk,title,parent_id',
    searchFields: 'chunk,title',
    highlight: 'chunk',
    highlightPreTag: '<mark>',
    highlightPostTag: '</mark>',
  };

  // メタデータでユーザーIDフィルタ
  if (userId) {
    // Blobメタデータはインデックスに含まれている場合のみ
    // searchBody.filter = `metadata_user_id eq '${userId}'`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': searchApiKey,
    },
    body: JSON.stringify(searchBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`検索エラー: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// POST: 検索 or インデクサー実行
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,          // 'search' | 'run-indexer'
      query,           // 検索クエリ
      searchEndpoint,
      searchApiKey,
      indexName,
      indexerName,
      userId,
      top,
    } = body;

    if (!searchEndpoint || !searchApiKey) {
      return NextResponse.json(
        { error: 'searchEndpoint と searchApiKey は必須です' },
        { status: 400 }
      );
    }

    if (action === 'run-indexer') {
      if (!indexerName) {
        return NextResponse.json(
          { error: 'indexerName は必須です' },
          { status: 400 }
        );
      }
      
      const result = await runIndexer(searchEndpoint, searchApiKey, indexerName);
      return NextResponse.json(result);
    }

    if (action === 'search') {
      if (!indexName || !query) {
        return NextResponse.json(
          { error: 'indexName と query は必須です' },
          { status: 400 }
        );
      }
      
      const result = await searchPrivateRAG(
        query,
        searchEndpoint,
        searchApiKey,
        indexName,
        userId,
        top || 5
      );
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: '無効なアクション: search または run-indexer を指定してください' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Private RAG API エラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: インデクサーステータス取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchEndpoint = searchParams.get('searchEndpoint');
    const searchApiKey = searchParams.get('searchApiKey');
    const indexerName = searchParams.get('indexerName');

    if (!searchEndpoint || !searchApiKey || !indexerName) {
      return NextResponse.json(
        { error: 'searchEndpoint, searchApiKey, indexerName は必須です' },
        { status: 400 }
      );
    }

    const status = await getIndexerStatus(searchEndpoint, searchApiKey, indexerName);
    return NextResponse.json(status);
  } catch (error) {
    console.error('インデクサーステータス取得エラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
