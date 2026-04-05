import { ToolDefinition, SearchResult, SearchProvider } from '@/types';

// Tool definitions for function calling
export const AVAILABLE_TOOLS: ToolDefinition[] = [
  {
    name: 'web_search',
    description: 'Search the web for current information. Use this when you need to find up-to-date information, news, or facts that you might not know.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up on the web',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_current_time',
    description: 'Get the current date and time. Use this when asked about current time or date.',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'The timezone (e.g., "Asia/Tokyo", "UTC"). Defaults to Asia/Tokyo.',
        },
      },
      required: [],
    },
  },
  {
    name: 'calculator',
    description: 'Perform mathematical calculations. Use this for any math operations.',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The mathematical expression to evaluate (e.g., "2 + 2 * 3", "sqrt(16)", "sin(45)")',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'analyze_image',
    description: 'Analyze and describe the content of an image that the user has uploaded.',
    parameters: {
      type: 'object',
      properties: {
        imageIndex: {
          type: 'string',
          description: 'The index of the image to analyze (0 for first image, 1 for second, etc.)',
        },
        question: {
          type: 'string',
          description: 'Specific question about the image (optional)',
        },
      },
      required: [],
    },
  },
];

// Outlook Calendar Tools（Microsoft認証時のみ有効）
export const OUTLOOK_TOOLS: ToolDefinition[] = [
  {
    name: 'outlook_calendar_view',
    description: 'Outlook/Microsoft 365 カレンダーから指定期間の予定を取得します。ユーザーのスケジュール、会議、予定を確認する際に使用してください。',
    parameters: {
      type: 'object',
      properties: {
        startDateTime: {
          type: 'string',
          description: '開始日時（ISO 8601形式、例: 2026-01-01T00:00:00）',
        },
        endDateTime: {
          type: 'string',
          description: '終了日時（ISO 8601形式、例: 2026-01-07T23:59:59）',
        },
        timeZone: {
          type: 'string',
          description: 'タイムゾーン（例: Asia/Tokyo）。デフォルトはAsia/Tokyo',
        },
        maxResults: {
          type: 'number',
          description: '取得する最大件数。デフォルトは20件、最大50件',
        },
      },
      required: ['startDateTime', 'endDateTime'],
    },
  },
  {
    name: 'outlook_calendar_create',
    description: 'Outlook/Microsoft 365 カレンダーに新しい予定を作成します。会議のスケジュール、リマインダーの設定に使用してください。',
    parameters: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: '予定のタイトル/件名',
        },
        startDateTime: {
          type: 'string',
          description: '開始日時（ISO 8601形式、例: 2026-01-15T14:00:00）',
        },
        endDateTime: {
          type: 'string',
          description: '終了日時（ISO 8601形式、例: 2026-01-15T15:00:00）',
        },
        timeZone: {
          type: 'string',
          description: 'タイムゾーン（例: Asia/Tokyo）。デフォルトはAsia/Tokyo',
        },
        location: {
          type: 'string',
          description: '場所（オプション）',
        },
        body: {
          type: 'string',
          description: '予定の説明/本文（オプション）',
        },
        attendees: {
          type: 'string',
          description: '参加者のメールアドレス（カンマ区切り、例: user1@example.com,user2@example.com）',
        },
        isAllDay: {
          type: 'string',
          description: '終日予定かどうか（true/false）',
        },
      },
      required: ['subject', 'startDateTime', 'endDateTime'],
    },
  },
  {
    name: 'outlook_calendar_update',
    description: 'Outlook/Microsoft 365 カレンダーの既存の予定を更新・変更します。予定のタイトル、日時、場所などを変更する際に使用してください。変更したい項目のみ指定してください。',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: '更新する予定のID（outlook_calendar_viewで取得した予定のidフィールド）',
        },
        subject: {
          type: 'string',
          description: '新しい予定のタイトル/件名（変更する場合のみ）',
        },
        startDateTime: {
          type: 'string',
          description: '新しい開始日時（ISO 8601形式、例: 2026-01-15T14:00:00）（変更する場合のみ）',
        },
        endDateTime: {
          type: 'string',
          description: '新しい終了日時（ISO 8601形式、例: 2026-01-15T15:00:00）（変更する場合のみ）',
        },
        timeZone: {
          type: 'string',
          description: 'タイムゾーン（例: Asia/Tokyo）。デフォルトはAsia/Tokyo',
        },
        location: {
          type: 'string',
          description: '新しい場所（変更する場合のみ）',
        },
        body: {
          type: 'string',
          description: '新しい予定の説明/本文（変更する場合のみ）',
        },
        attendees: {
          type: 'string',
          description: '新しい参加者のメールアドレス（カンマ区切り、例: user1@example.com,user2@example.com）（変更する場合のみ）',
        },
        isAllDay: {
          type: 'string',
          description: '終日予定かどうか（true/false）（変更する場合のみ）',
        },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'outlook_calendar_delete',
    description: 'Outlook/Microsoft 365 カレンダーから予定を削除します。予定のキャンセル、削除に使用してください。',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: '削除する予定のID（outlook_calendar_viewで取得した予定のidフィールド）',
        },
        confirmDelete: {
          type: 'string',
          description: '削除確認（"yes"または"true"で削除を実行）。安全のため必須です。',
        },
      },
      required: ['eventId', 'confirmDelete'],
    },
  },
];

// Microsoft Teams Tools（Microsoft認証時のみ有効）
export const TEAMS_TOOLS: ToolDefinition[] = [
  {
    name: 'teams_search_messages',
    description: 'Microsoft Teamsの全チャネルメッセージを横断検索します。キーワードを指定して、ユーザーが参加している全てのチーム・チャネルからメッセージを検索します。過去の会話、スレッド情報、議事録などを探す際に使用してください。注意: プライベートチャットは含まれず、チャネルメッセージのみが対象です。',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: '検索するキーワード（メッセージ本文と件名を検索）',
        },
        maxResultsPerChannel: {
          type: 'number',
          description: '各チャネルごとの最大取得件数。デフォルトは20件',
        },
      },
      required: ['keyword'],
    },
  },
  {
    name: 'teams_get_channel_messages',
    description: '特定のチームとチャネルからメッセージを取得します。チャネル内の最新メッセージや会話履歴を確認する際に使用してください。',
    parameters: {
      type: 'object',
      properties: {
        teamId: {
          type: 'string',
          description: 'チームのID（teams_list_teamsで取得）',
        },
        channelId: {
          type: 'string',
          description: 'チャネルのID（teams_list_channelsで取得）',
        },
        maxResults: {
          type: 'number',
          description: '取得する最大件数。デフォルトは50件、最大50件',
        },
      },
      required: ['teamId', 'channelId'],
    },
  },
  {
    name: 'teams_get_message_replies',
    description: 'Teamsメッセージのスレッド（返信）を取得します。特定のメッセージに対する返信や議論の流れを確認する際に使用してください。',
    parameters: {
      type: 'object',
      properties: {
        teamId: {
          type: 'string',
          description: 'チームのID',
        },
        channelId: {
          type: 'string',
          description: 'チャネルのID',
        },
        messageId: {
          type: 'string',
          description: 'メッセージのID（teams_get_channel_messagesで取得）',
        },
      },
      required: ['teamId', 'channelId', 'messageId'],
    },
  },
  {
    name: 'teams_list_teams',
    description: 'ユーザーが参加しているTeamsチームの一覧を取得します。チームの名前やIDを確認する際に使用してください。',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'teams_list_channels',
    description: '特定のチームのチャネル一覧を取得します。チームに属するチャネルを確認する際に使用してください。',
    parameters: {
      type: 'object',
      properties: {
        teamId: {
          type: 'string',
          description: 'チームのID（teams_list_teamsで取得）',
        },
      },
      required: ['teamId'],
    },
  },
];

// Search configuration
interface SearchConfig {
  provider: SearchProvider;
  tavilyApiKey?: string;
  braveApiKey?: string;
}

// Tool execution context（Outlook等の追加コンテキスト）
export interface ToolContext {
  outlookEnabled?: boolean;
  teamsEnabled?: boolean;
}

// Tavily Search API (recommended for AI agents)
async function searchWithTavily(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: 'basic',
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tavily API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    // Include AI-generated answer if available
    if (data.answer) {
      results.push({
        title: 'AI Summary',
        url: '',
        snippet: data.answer,
      });
    }

    // Add search results
    if (data.results && Array.isArray(data.results)) {
      for (const item of data.results) {
        results.push({
          title: item.title || 'Result',
          url: item.url || '',
          snippet: item.content || '',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Tavily search error:', error);
    throw error;
  }
}

// Brave Search API
async function searchWithBrave(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Brave Search API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    if (data.web?.results && Array.isArray(data.web.results)) {
      for (const item of data.web.results) {
        results.push({
          title: item.title || 'Result',
          url: item.url || '',
          snippet: item.description || '',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Brave search error:', error);
    throw error;
  }
}

// DuckDuckGo (fallback, no API key needed but limited)
async function searchWithDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );
    
    if (!response.ok) {
      throw new Error('DuckDuckGo request failed');
    }
    
    const data = await response.json();
    const results: SearchResult[] = [];
    
    // Get abstract if available
    if (data.Abstract) {
      results.push({
        title: data.Heading || 'Result',
        url: data.AbstractURL || '',
        snippet: data.Abstract,
      });
    }
    
    // Get related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related',
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    throw error;
  }
}

// Main search function
export async function executeWebSearch(
  query: string, 
  config?: SearchConfig
): Promise<SearchResult[]> {
  const provider = config?.provider || 'duckduckgo';
  
  try {
    let results: SearchResult[] = [];
    
    switch (provider) {
      case 'tavily':
        if (!config?.tavilyApiKey) {
          throw new Error('Tavily API key is required');
        }
        results = await searchWithTavily(query, config.tavilyApiKey);
        break;
        
      case 'brave':
        if (!config?.braveApiKey) {
          throw new Error('Brave Search API key is required');
        }
        results = await searchWithBrave(query, config.braveApiKey);
        break;
        
      case 'duckduckgo':
      default:
        results = await searchWithDuckDuckGo(query);
        break;
    }
    
    if (results.length === 0) {
      return [{
        title: `検索: ${query}`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: `検索結果が見つかりませんでした。直接検索してみてください。`,
      }];
    }
    
    return results;
  } catch (error) {
    console.error('Search error:', error);
    
    // Fallback to DuckDuckGo if other providers fail
    if (provider !== 'duckduckgo') {
      console.log('Falling back to DuckDuckGo...');
      try {
        return await searchWithDuckDuckGo(query);
      } catch {
        // Final fallback
      }
    }
    
    return [{
      title: '検索エラー',
      url: '',
      snippet: `検索に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }];
  }
}

export function getCurrentTime(timezone: string = 'Asia/Tokyo'): string {
  try {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    return now.toLocaleString('ja-JP', options);
  } catch {
    return new Date().toISOString();
  }
}

export function calculate(expression: string): string {
  try {
    // Add Math functions support
    const withMathFuncs = expression
      .replace(/sqrt\(/gi, 'Math.sqrt(')
      .replace(/sin\(/gi, 'Math.sin(')
      .replace(/cos\(/gi, 'Math.cos(')
      .replace(/tan\(/gi, 'Math.tan(')
      .replace(/log\(/gi, 'Math.log10(')
      .replace(/ln\(/gi, 'Math.log(')
      .replace(/abs\(/gi, 'Math.abs(')
      .replace(/pow\(/gi, 'Math.pow(')
      .replace(/pi/gi, 'Math.PI')
      .replace(/e(?![a-z])/gi, 'Math.E')
      .replace(/\^/g, '**');
    
    // Validate expression (allow only safe characters)
    if (!/^[0-9+\-*/().%\s,Math.sqrtcoinabpwPIE]+$/.test(withMathFuncs.replace(/Math\./g, ''))) {
      throw new Error('Invalid characters in expression');
    }
    
    // Use Function constructor for safer eval
    const result = new Function(`return ${withMathFuncs}`)();
    
    if (typeof result === 'number') {
      if (Number.isNaN(result)) return 'Error: Invalid calculation';
      if (!Number.isFinite(result)) return 'Error: Result is infinite';
      return result.toString();
    }
    return 'Error: Invalid expression';
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : 'Invalid expression'}`;
  }
}

// Execute a tool by name
export async function executeTool(
  toolName: string, 
  args: Record<string, unknown>,
  searchConfig?: SearchConfig,
  toolContext?: ToolContext
): Promise<string> {
  switch (toolName) {
    case 'web_search': {
      const results = await executeWebSearch(args.query as string, searchConfig);
      if (results.length === 0) {
        return 'No search results found.';
      }
      return JSON.stringify(results, null, 2);
    }
    
    case 'get_current_time': {
      const timezone = (args.timezone as string) || 'Asia/Tokyo';
      return getCurrentTime(timezone);
    }
    
    case 'calculator': {
      return calculate(args.expression as string);
    }
    
    case 'analyze_image': {
      // Image analysis is handled differently - returns a prompt for the LLM
      return 'IMAGE_ANALYSIS_REQUESTED';
    }
    
    case 'outlook_calendar_view': {
      // Outlookカレンダー参照
      if (!toolContext?.outlookEnabled) {
        return JSON.stringify({
          error: 'Outlook連携が有効になっていません。設定画面でMicrosoftアカウントにサインインしてください。',
        });
      }
      try {
        // 動的インポート（クライアントサイドのみ）
        const { getCalendarEvents, formatCalendarEventsForLLM, isSignedIn } = await import('./outlook');
        
        if (!isSignedIn()) {
          return JSON.stringify({
            error: 'Microsoftアカウントにサインインしていません。設定画面からサインインしてください。',
          });
        }
        
        const startDateTime = args.startDateTime as string;
        const endDateTime = args.endDateTime as string;
        const timeZone = (args.timeZone as string) || 'Asia/Tokyo';
        const maxResults = Math.min(Number(args.maxResults) || 20, 50);
        
        const events = await getCalendarEvents(startDateTime, endDateTime, timeZone, maxResults);
        const formattedEvents = formatCalendarEventsForLLM(events);
        
        return JSON.stringify({
          success: true,
          count: events.length,
          period: { start: startDateTime, end: endDateTime },
          events: formattedEvents,
          rawEvents: events, // LLMが詳細を参照できるように
        }, null, 2);
      } catch (error) {
        return JSON.stringify({
          error: `カレンダー取得エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
    
    case 'outlook_calendar_create': {
      // Outlookカレンダー作成
      if (!toolContext?.outlookEnabled) {
        return JSON.stringify({
          error: 'Outlook連携が有効になっていません。設定画面でMicrosoftアカウントにサインインしてください。',
        });
      }
      try {
        const { createCalendarEvent, isSignedIn } = await import('./outlook');
        
        if (!isSignedIn()) {
          return JSON.stringify({
            error: 'Microsoftアカウントにサインインしていません。設定画面からサインインしてください。',
          });
        }
        
        const attendeesStr = args.attendees as string | undefined;
        const attendees = attendeesStr ? attendeesStr.split(',').map(e => e.trim()) : undefined;
        
        const event = await createCalendarEvent({
          subject: args.subject as string,
          startDateTime: args.startDateTime as string,
          endDateTime: args.endDateTime as string,
          timeZone: (args.timeZone as string) || 'Asia/Tokyo',
          location: args.location as string | undefined,
          body: args.body as string | undefined,
          attendees,
          isAllDay: args.isAllDay === 'true',
        });
        
        return JSON.stringify({
          success: true,
          message: '予定を作成しました！',
          event: {
            id: event.id,
            subject: event.subject,
            start: event.start,
            end: event.end,
            location: event.location?.displayName,
            webLink: event.webLink,
          },
        }, null, 2);
      } catch (error) {
        return JSON.stringify({
          error: `予定作成エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
    
    case 'outlook_calendar_update': {
      // Outlookカレンダー更新
      if (!toolContext?.outlookEnabled) {
        return JSON.stringify({
          error: 'Outlook連携が有効になっていません。設定画面でMicrosoftアカウントにサインインしてください。',
        });
      }
      try {
        const { updateCalendarEvent, isSignedIn } = await import('./outlook');
        
        if (!isSignedIn()) {
          return JSON.stringify({
            error: 'Microsoftアカウントにサインインしていません。設定画面からサインインしてください。',
          });
        }
        
        const eventId = args.eventId as string;
        if (!eventId) {
          return JSON.stringify({
            error: '予定のID（eventId）が指定されていません。先にoutlook_calendar_viewで予定を取得してIDを確認してください。',
          });
        }
        
        const attendeesStr = args.attendees as string | undefined;
        const attendees = attendeesStr ? attendeesStr.split(',').map(e => e.trim()) : undefined;
        
        const updateData: Record<string, unknown> = {};
        if (args.subject) updateData.subject = args.subject;
        if (args.startDateTime) updateData.startDateTime = args.startDateTime;
        if (args.endDateTime) updateData.endDateTime = args.endDateTime;
        if (args.timeZone) updateData.timeZone = args.timeZone;
        if (args.location) updateData.location = args.location;
        if (args.body) updateData.body = args.body;
        if (attendees) updateData.attendees = attendees;
        if (args.isAllDay !== undefined) updateData.isAllDay = args.isAllDay === 'true';
        
        const event = await updateCalendarEvent(eventId, updateData as Parameters<typeof updateCalendarEvent>[1]);
        
        return JSON.stringify({
          success: true,
          message: '予定を更新しました！',
          event: {
            id: event.id,
            subject: event.subject,
            start: event.start,
            end: event.end,
            location: event.location?.displayName,
            webLink: event.webLink,
          },
        }, null, 2);
      } catch (error) {
        return JSON.stringify({
          error: `予定更新エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
    
    case 'outlook_calendar_delete': {
      // Outlookカレンダー削除
      if (!toolContext?.outlookEnabled) {
        return JSON.stringify({
          error: 'Outlook連携が有効になっていません。設定画面でMicrosoftアカウントにサインインしてください。',
        });
      }
      try {
        const { deleteCalendarEvent, getCalendarEventById, isSignedIn } = await import('./outlook');
        
        if (!isSignedIn()) {
          return JSON.stringify({
            error: 'Microsoftアカウントにサインインしていません。設定画面からサインインしてください。',
          });
        }
        
        const eventId = args.eventId as string;
        const confirmDelete = args.confirmDelete as string;
        
        if (!eventId) {
          return JSON.stringify({
            error: '予定のID（eventId）が指定されていません。先にoutlook_calendar_viewで予定を取得してIDを確認してください。',
          });
        }
        
        if (confirmDelete !== 'yes' && confirmDelete !== 'true') {
          return JSON.stringify({
            error: '削除を実行するには confirmDelete に "yes" または "true" を指定してください。',
            hint: 'ユーザーに削除の確認を取ってから再度実行してください。',
          });
        }
        
        // 削除前に予定情報を取得（削除後の確認用）
        let deletedEventInfo = null;
        try {
          const eventToDelete = await getCalendarEventById(eventId);
          deletedEventInfo = {
            subject: eventToDelete.subject,
            start: eventToDelete.start,
            end: eventToDelete.end,
          };
        } catch {
          // 取得できなくても削除は試行
        }
        
        await deleteCalendarEvent(eventId);
        
        return JSON.stringify({
          success: true,
          message: '予定を削除しました！',
          deletedEvent: deletedEventInfo,
        }, null, 2);
      } catch (error) {
        return JSON.stringify({
          error: `予定削除エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
    
    // ============================================
    // Microsoft Teams Tools
    // ============================================
    
    case 'teams_search_messages': {
      if (!toolContext?.teamsEnabled) {
        return JSON.stringify({
          error: 'Teams連携が有効になっていません。設定画面でMicrosoftアカウントにサインインしてください。',
        });
      }
      try {
        const { searchAllTeamsMessages, formatSearchResultsForLLM, isTeamsEnabled } = await import('./teams');
        
        if (!isTeamsEnabled()) {
          return JSON.stringify({
            error: 'Microsoftアカウントにサインインしていません。設定画面からサインインしてください。',
          });
        }
        
        const keyword = args.keyword as string;
        const maxResultsPerChannel = Math.min(Number(args.maxResultsPerChannel) || 20, 50);
        
        const results = await searchAllTeamsMessages(keyword, maxResultsPerChannel);
        const formattedResults = formatSearchResultsForLLM(results);
        
        return JSON.stringify({
          success: true,
          keyword,
          totalChannelsWithResults: results.length,
          results: formattedResults,
        }, null, 2);
      } catch (error) {
        return JSON.stringify({
          error: `Teams検索エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
    
    case 'teams_get_channel_messages': {
      if (!toolContext?.teamsEnabled) {
        return JSON.stringify({
          error: 'Teams連携が有効になっていません。設定画面でMicrosoftアカウントにサインインしてください。',
        });
      }
      try {
        const { getChannelMessages, formatTeamsMessagesForLLM, isTeamsEnabled } = await import('./teams');
        
        if (!isTeamsEnabled()) {
          return JSON.stringify({
            error: 'Microsoftアカウントにサインインしていません。設定画面からサインインしてください。',
          });
        }
        
        const teamId = args.teamId as string;
        const channelId = args.channelId as string;
        const maxResults = Math.min(Number(args.maxResults) || 50, 50);
        
        const messages = await getChannelMessages(teamId, channelId, maxResults);
        const formattedMessages = formatTeamsMessagesForLLM(messages);
        
        return JSON.stringify({
          success: true,
          count: messages.length,
          messages: formattedMessages,
          rawMessages: messages,
        }, null, 2);
      } catch (error) {
        return JSON.stringify({
          error: `チャネルメッセージ取得エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
    
    case 'teams_get_message_replies': {
      if (!toolContext?.teamsEnabled) {
        return JSON.stringify({
          error: 'Teams連携が有効になっていません。設定画面でMicrosoftアカウントにサインインしてください。',
        });
      }
      try {
        const { getMessageReplies, formatTeamsMessagesForLLM, isTeamsEnabled } = await import('./teams');
        
        if (!isTeamsEnabled()) {
          return JSON.stringify({
            error: 'Microsoftアカウントにサインインしていません。設定画面からサインインしてください。',
          });
        }
        
        const teamId = args.teamId as string;
        const channelId = args.channelId as string;
        const messageId = args.messageId as string;
        
        const replies = await getMessageReplies(teamId, channelId, messageId);
        const formattedReplies = formatTeamsMessagesForLLM(replies, { includeReplies: true });
        
        return JSON.stringify({
          success: true,
          count: replies.length,
          replies: formattedReplies,
          rawReplies: replies,
        }, null, 2);
      } catch (error) {
        return JSON.stringify({
          error: `スレッド取得エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
    
    case 'teams_list_teams': {
      if (!toolContext?.teamsEnabled) {
        return JSON.stringify({
          error: 'Teams連携が有効になっていません。設定画面でMicrosoftアカウントにサインインしてください。',
        });
      }
      try {
        const { getJoinedTeams, isTeamsEnabled } = await import('./teams');
        
        if (!isTeamsEnabled()) {
          return JSON.stringify({
            error: 'Microsoftアカウントにサインインしていません。設定画面からサインインしてください。',
          });
        }
        
        const teams = await getJoinedTeams();
        
        return JSON.stringify({
          success: true,
          count: teams.length,
          teams: teams.map(t => ({
            id: t.id,
            name: t.displayName,
            description: t.description,
          })),
        }, null, 2);
      } catch (error) {
        return JSON.stringify({
          error: `チーム一覧取得エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
    
    case 'teams_list_channels': {
      if (!toolContext?.teamsEnabled) {
        return JSON.stringify({
          error: 'Teams連携が有効になっていません。設定画面でMicrosoftアカウントにサインインしてください。',
        });
      }
      try {
        const { getTeamChannels, isTeamsEnabled } = await import('./teams');
        
        if (!isTeamsEnabled()) {
          return JSON.stringify({
            error: 'Microsoftアカウントにサインインしていません。設定画面からサインインしてください。',
          });
        }
        
        const teamId = args.teamId as string;
        const channels = await getTeamChannels(teamId);
        
        return JSON.stringify({
          success: true,
          count: channels.length,
          channels: channels.map(c => ({
            id: c.id,
            name: c.displayName,
            description: c.description,
          })),
        }, null, 2);
      } catch (error) {
        return JSON.stringify({
          error: `チャネル一覧取得エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
    
    default:
      return `Unknown tool: ${toolName}`;
  }
}

// Convert tools to OpenAI/Azure format
export function getOpenAITools(includeOutlook: boolean = false, includeTeams: boolean = false) {
  let tools = [...AVAILABLE_TOOLS];
  if (includeOutlook) tools = [...tools, ...OUTLOOK_TOOLS];
  if (includeTeams) tools = [...tools, ...TEAMS_TOOLS];
    
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

// Convert tools to Gemini format
export function getGeminiTools(includeOutlook: boolean = false, includeTeams: boolean = false) {
  let tools = [...AVAILABLE_TOOLS];
  if (includeOutlook) tools = [...tools, ...OUTLOOK_TOOLS];
  if (includeTeams) tools = [...tools, ...TEAMS_TOOLS];
    
  return [{
    functionDeclarations: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
  }];
}
