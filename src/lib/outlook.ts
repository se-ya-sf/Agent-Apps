'use client';

import { PublicClientApplication, AccountInfo, InteractionRequiredAuthError } from '@azure/msal-browser';
import type { OutlookCalendarEvent, CreateCalendarEventInput, UpdateCalendarEventInput } from '@/types';

// MSAL設定
let msalInstance: PublicClientApplication | null = null;
let currentAccount: AccountInfo | null = null;

// Graph APIのスコープ
const GRAPH_SCOPES = [
  'User.Read',
  'Calendars.Read',
  'Calendars.ReadWrite',
];

// MSALインスタンスの初期化
export async function initializeMsal(clientId: string, tenantId: string, redirectUri?: string): Promise<void> {
  if (msalInstance) {
    return; // 既に初期化済み
  }

  const msalConfig = {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri: redirectUri || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
    },
    cache: {
      cacheLocation: 'sessionStorage' as const,
      storeAuthStateInCookie: false,
    },
  };

  msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();

  // 既存のアカウントをチェック
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    currentAccount = accounts[0];
  }
}

// サインイン（ポップアップ）
export async function signInWithMicrosoft(): Promise<AccountInfo | null> {
  if (!msalInstance) {
    throw new Error('MSAL is not initialized. Call initializeMsal first.');
  }

  try {
    const response = await msalInstance.loginPopup({
      scopes: GRAPH_SCOPES,
    });
    currentAccount = response.account;
    return currentAccount;
  } catch (error) {
    console.error('Microsoft sign-in error:', error);
    throw error;
  }
}

// サインアウト
export async function signOutFromMicrosoft(): Promise<void> {
  if (!msalInstance || !currentAccount) {
    return;
  }

  try {
    await msalInstance.logoutPopup({
      account: currentAccount,
    });
    currentAccount = null;
  } catch (error) {
    console.error('Microsoft sign-out error:', error);
    throw error;
  }
}

// アクセストークンの取得
async function getAccessToken(): Promise<string> {
  if (!msalInstance) {
    throw new Error('MSAL is not initialized');
  }

  if (!currentAccount) {
    throw new Error('Not signed in. Please sign in with Microsoft first.');
  }

  try {
    // まずサイレント取得を試みる
    const response = await msalInstance.acquireTokenSilent({
      scopes: GRAPH_SCOPES,
      account: currentAccount,
    });
    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // サイレント取得が失敗した場合、ポップアップで再認証
      const response = await msalInstance.acquireTokenPopup({
        scopes: GRAPH_SCOPES,
      });
      return response.accessToken;
    }
    throw error;
  }
}

// 現在のアカウント情報を取得
export function getCurrentAccount(): AccountInfo | null {
  return currentAccount;
}

// サインイン状態のチェック
export function isSignedIn(): boolean {
  return currentAccount !== null;
}

// Graph API呼び出しヘルパー
async function callGraphApi<T>(endpoint: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET', body?: unknown): Promise<T> {
  const accessToken = await getAccessToken();

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Graph API error: ${response.status} - ${errorText}`);
  }

  // DELETEは空レスポンスの場合がある
  if (method === 'DELETE') {
    return {} as T;
  }

  return response.json();
}

// カレンダー予定の取得（calendarView）
export async function getCalendarEvents(
  startDateTime: string,
  endDateTime: string,
  timeZone: string = 'Asia/Tokyo',
  maxResults: number = 50
): Promise<OutlookCalendarEvent[]> {
  const params = new URLSearchParams({
    startDateTime,
    endDateTime,
    $top: maxResults.toString(),
    $orderby: 'start/dateTime',
    $select: 'id,subject,start,end,location,isAllDay,organizer,attendees,bodyPreview,webLink,showAs',
  });

  const response = await callGraphApi<{ value: OutlookCalendarEvent[] }>(
    `/me/calendarView?${params.toString()}`,
    'GET'
  );

  return response.value || [];
}

// 予定の作成
export async function createCalendarEvent(input: CreateCalendarEventInput): Promise<OutlookCalendarEvent> {
  const eventBody: Record<string, unknown> = {
    subject: input.subject,
    start: {
      dateTime: input.startDateTime,
      timeZone: input.timeZone || 'Asia/Tokyo',
    },
    end: {
      dateTime: input.endDateTime,
      timeZone: input.timeZone || 'Asia/Tokyo',
    },
  };

  if (input.location) {
    eventBody.location = {
      displayName: input.location,
    };
  }

  if (input.body) {
    eventBody.body = {
      contentType: 'text',
      content: input.body,
    };
  }

  if (input.attendees && input.attendees.length > 0) {
    eventBody.attendees = input.attendees.map(email => ({
      emailAddress: {
        address: email,
      },
      type: 'required',
    }));
  }

  if (input.isAllDay) {
    eventBody.isAllDay = true;
  }

  return callGraphApi<OutlookCalendarEvent>('/me/events', 'POST', eventBody);
}

// 予定の更新
export async function updateCalendarEvent(eventId: string, input: UpdateCalendarEventInput): Promise<OutlookCalendarEvent> {
  const eventBody: Record<string, unknown> = {};

  if (input.subject !== undefined) {
    eventBody.subject = input.subject;
  }

  if (input.startDateTime !== undefined) {
    eventBody.start = {
      dateTime: input.startDateTime,
      timeZone: input.timeZone || 'Asia/Tokyo',
    };
  }

  if (input.endDateTime !== undefined) {
    eventBody.end = {
      dateTime: input.endDateTime,
      timeZone: input.timeZone || 'Asia/Tokyo',
    };
  }

  if (input.location !== undefined) {
    eventBody.location = {
      displayName: input.location,
    };
  }

  if (input.body !== undefined) {
    eventBody.body = {
      contentType: 'text',
      content: input.body,
    };
  }

  if (input.attendees !== undefined) {
    eventBody.attendees = input.attendees.map(email => ({
      emailAddress: {
        address: email,
      },
      type: 'required',
    }));
  }

  if (input.isAllDay !== undefined) {
    eventBody.isAllDay = input.isAllDay;
  }

  return callGraphApi<OutlookCalendarEvent>(`/me/events/${eventId}`, 'PATCH', eventBody);
}

// 予定の削除
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await callGraphApi<void>(`/me/events/${eventId}`, 'DELETE');
}

// 予定IDで単一イベントを取得
export async function getCalendarEventById(eventId: string): Promise<OutlookCalendarEvent> {
  return callGraphApi<OutlookCalendarEvent>(
    `/me/events/${eventId}?$select=id,subject,start,end,location,isAllDay,organizer,attendees,bodyPreview,webLink,showAs`
  );
}

// フリービジー情報の取得（簡易版）
export async function getFreeBusyInfo(
  startDateTime: string,
  endDateTime: string,
  timeZone: string = 'Asia/Tokyo'
): Promise<Array<{ status: string; start: string; end: string }>> {
  const events = await getCalendarEvents(startDateTime, endDateTime, timeZone);
  
  return events.map(event => ({
    status: event.showAs || 'busy',
    start: event.start.dateTime,
    end: event.end.dateTime,
  }));
}

// ユーザー情報の取得
export async function getUserProfile(): Promise<{ displayName: string; mail: string }> {
  return callGraphApi<{ displayName: string; mail: string }>('/me?$select=displayName,mail');
}

// カレンダーイベントを読みやすい形式にフォーマット
export function formatCalendarEventsForLLM(events: OutlookCalendarEvent[]): string {
  if (events.length === 0) {
    return '予定はありません。';
  }

  return events.map((event, index) => {
    const startDate = new Date(event.start.dateTime);
    const endDate = new Date(event.end.dateTime);
    
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    const dateStr = startDate.toLocaleDateString('ja-JP', dateOptions);
    const startTime = startDate.toLocaleTimeString('ja-JP', timeOptions);
    const endTime = endDate.toLocaleTimeString('ja-JP', timeOptions);

    let result = `[${index + 1}] ${event.subject}\n`;
    result += `   📅 ${dateStr}\n`;
    
    if (event.isAllDay) {
      result += `   🕐 終日\n`;
    } else {
      result += `   🕐 ${startTime} - ${endTime}\n`;
    }

    if (event.location?.displayName) {
      result += `   📍 ${event.location.displayName}\n`;
    }

    if (event.organizer?.emailAddress?.name) {
      result += `   👤 主催者: ${event.organizer.emailAddress.name}\n`;
    }

    if (event.attendees && event.attendees.length > 0) {
      const attendeeNames = event.attendees
        .map(a => a.emailAddress.name || a.emailAddress.address)
        .join(', ');
      result += `   👥 参加者: ${attendeeNames}\n`;
    }

    if (event.showAs) {
      const statusMap: Record<string, string> = {
        free: '空き',
        tentative: '仮の予定',
        busy: '予定あり',
        oof: '外出中',
        workingElsewhere: '他の場所で作業中',
      };
      result += `   📊 状態: ${statusMap[event.showAs] || event.showAs}\n`;
    }

    return result;
  }).join('\n');
}
