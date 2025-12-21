import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchEndpoint, searchApiKey, indexName, query } = body;

    if (!searchEndpoint || !searchApiKey || !indexName || !query) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const searchUrl = `${searchEndpoint}/indexes/${indexName}/docs/search?api-version=2024-07-01`;

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': searchApiKey,
      },
      body: JSON.stringify({
        search: query,
        top: 5,
        queryType: 'semantic',
        semanticConfiguration: 'default',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure Search error:', response.status, errorText);
      return NextResponse.json(
        { error: `Azure Search error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
