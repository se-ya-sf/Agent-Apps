import { NextRequest, NextResponse } from 'next/server';

/**
 * Azure AI Search API Route
 * セマンティック検索が失敗した場合は自動的にシンプル検索にフォールバック
 * 
 * セマンティック検索の400エラー原因:
 * 1. インデックスにセマンティック設定がない
 * 2. semanticConfiguration名が 'default' ではない
 * 3. APIバージョンがセマンティック検索をサポートしていない
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchEndpoint, searchApiKey, indexName, query, useSimpleSearch } = body;

    if (!searchEndpoint || !searchApiKey || !indexName || !query) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // エンドポイントの末尾スラッシュを正規化
    const normalizedEndpoint = searchEndpoint.replace(/\/$/, '');
    const searchUrl = `${normalizedEndpoint}/indexes/${indexName}/docs/search?api-version=2024-07-01`;

    // シンプル検索を使用するかどうか（フォールバック時 or 明示指定時）
    const searchBody = useSimpleSearch 
      ? {
          search: query,
          top: 5,
          queryType: 'simple',
          // シンプル検索では searchFields を指定して検索対象を明確化
          select: 'content,title,chunk,id',
        }
      : {
          search: query,
          top: 5,
          queryType: 'semantic',
          semanticConfiguration: 'default',
        };

    console.log('Azure Search リクエスト:', {
      url: searchUrl,
      indexName,
      queryType: searchBody.queryType,
      query: query.substring(0, 100) + '...',
    });

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': searchApiKey,
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure Search error:', response.status, errorText);
      
      // セマンティック検索で400エラーの場合、シンプル検索にフォールバック
      if (response.status === 400 && !useSimpleSearch) {
        console.log('セマンティック検索が失敗しました。シンプル検索にフォールバックします...');
        
        // 再帰的にシンプル検索を実行
        const fallbackResponse = await fetch(request.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...body,
            useSimpleSearch: true,
          }),
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return NextResponse.json({
            ...fallbackData,
            _fallbackUsed: true,
            _originalError: errorText,
          });
        }
      }
      
      // エラー詳細を返す
      return NextResponse.json(
        { 
          error: `Azure Search error: ${response.status}`, 
          details: errorText,
          suggestion: response.status === 400 
            ? 'インデックスにセマンティック設定がない可能性があります。Azure Portal でセマンティック検索を有効化するか、設定でシンプル検索を使用してください。'
            : undefined,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Azure Search 成功:', {
      resultCount: data.value?.length || 0,
      queryType: searchBody.queryType,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
