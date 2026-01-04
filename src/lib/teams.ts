'use client';

import { getCurrentAccount } from './outlook';
import type { TeamsMessage, TeamsChannel, TeamsChat } from '@/types';

// Graph APIのスコープ（Teamsアクセス用）
export const TEAMS_SCOPES = [
  'User.Read',
  'Team.ReadBasic.All',
  'Channel.ReadBasic.All',
  'ChannelMessage.Read.All',
  'Chat.Read',
  'Chat.ReadBasic',
];

// Graph API呼び出しヘルパー（outlookモジュールと共通化可能だが、分離して管理）
async function callGraphApi<T>(endpoint: string, accessToken: string, method: 'GET' | 'POST' = 'GET'): Promise<T> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Graph API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// アクセストークンの取得（outlookモジュールを利用）
async function getAccessToken(): Promise<string> {
  // MSAL経由でトークンを取得
  // outlookモジュールと同じMSALインスタンスを使用するため、outlookモジュールの関数を利用
  const { getAccessToken: getOutlookToken } = await import('./outlook');
  return getOutlookToken();
}

// サインイン状態のチェック
export function isTeamsEnabled(): boolean {
  return getCurrentAccount() !== null;
}

/**
 * ユーザーが参加している全チームを取得
 */
export async function getJoinedTeams(accessToken?: string): Promise<Array<{ id: string; displayName: string; description?: string }>> {
  const token = accessToken || await getAccessToken();
  const response = await callGraphApi<{ value: Array<{ id: string; displayName: string; description?: string }> }>(
    '/me/joinedTeams',
    token
  );
  return response.value || [];
}

/**
 * 特定チームのチャネル一覧を取得
 */
export async function getTeamChannels(teamId: string, accessToken?: string): Promise<TeamsChannel[]> {
  const token = accessToken || await getAccessToken();
  const response = await callGraphApi<{ value: TeamsChannel[] }>(
    `/teams/${teamId}/channels`,
    token
  );
  return response.value || [];
}

/**
 * チャネル内のメッセージを取得（最新N件）
 */
export async function getChannelMessages(
  teamId: string,
  channelId: string,
  maxResults: number = 50,
  accessToken?: string
): Promise<TeamsMessage[]> {
  const token = accessToken || await getAccessToken();
  const params = new URLSearchParams({
    $top: Math.min(maxResults, 50).toString(),
    $orderby: 'createdDateTime desc',
  });
  
  const response = await callGraphApi<{ value: TeamsMessage[] }>(
    `/teams/${teamId}/channels/${channelId}/messages?${params.toString()}`,
    token
  );
  return response.value || [];
}

/**
 * メッセージの返信（スレッド）を取得
 */
export async function getMessageReplies(
  teamId: string,
  channelId: string,
  messageId: string,
  accessToken?: string
): Promise<TeamsMessage[]> {
  const token = accessToken || await getAccessToken();
  const response = await callGraphApi<{ value: TeamsMessage[] }>(
    `/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`,
    token
  );
  return response.value || [];
}

/**
 * ユーザーのチャット一覧を取得
 */
export async function getUserChats(maxResults: number = 50, accessToken?: string): Promise<TeamsChat[]> {
  const token = accessToken || await getAccessToken();
  const params = new URLSearchParams({
    $top: Math.min(maxResults, 50).toString(),
    $expand: 'members',
  });
  
  const response = await callGraphApi<{ value: TeamsChat[] }>(
    `/me/chats?${params.toString()}`,
    token
  );
  return response.value || [];
}

/**
 * 特定チャットのメッセージを取得
 */
export async function getChatMessages(
  chatId: string,
  maxResults: number = 50,
  accessToken?: string
): Promise<TeamsMessage[]> {
  const token = accessToken || await getAccessToken();
  const params = new URLSearchParams({
    $top: Math.min(maxResults, 50).toString(),
    $orderby: 'createdDateTime desc',
  });
  
  const response = await callGraphApi<{ value: TeamsMessage[] }>(
    `/chats/${chatId}/messages?${params.toString()}`,
    token
  );
  return response.value || [];
}

/**
 * キーワードでチャネルメッセージを検索
 * （Microsoft Graph APIにはメッセージ検索の直接APIがないため、取得後にフィルタリング）
 */
export async function searchChannelMessages(
  teamId: string,
  channelId: string,
  keyword: string,
  maxResults: number = 50,
  accessToken?: string
): Promise<TeamsMessage[]> {
  const messages = await getChannelMessages(teamId, channelId, maxResults, accessToken);
  const lowerKeyword = keyword.toLowerCase();
  
  return messages.filter(msg => {
    const bodyText = msg.body?.content?.toLowerCase() || '';
    const subject = msg.subject?.toLowerCase() || '';
    return bodyText.includes(lowerKeyword) || subject.includes(lowerKeyword);
  });
}

/**
 * 全参加チームのメッセージを横断検索
 */
export async function searchAllTeamsMessages(
  keyword: string,
  maxResultsPerChannel: number = 20,
  accessToken?: string
): Promise<Array<{ team: string; channel: string; messages: TeamsMessage[] }>> {
  const token = accessToken || await getAccessToken();
  const teams = await getJoinedTeams(token);
  const results: Array<{ team: string; channel: string; messages: TeamsMessage[] }> = [];

  for (const team of teams) {
    try {
      const channels = await getTeamChannels(team.id, token);
      for (const channel of channels) {
        try {
          const messages = await searchChannelMessages(team.id, channel.id, keyword, maxResultsPerChannel, token);
          if (messages.length > 0) {
            results.push({
              team: team.displayName,
              channel: channel.displayName || 'General',
              messages,
            });
          }
        } catch (error) {
          console.warn(`Failed to search in channel ${channel.displayName}:`, error);
          // 権限がないチャネルなどはスキップ
        }
      }
    } catch (error) {
      console.warn(`Failed to get channels for team ${team.displayName}:`, error);
    }
  }

  return results;
}

/**
 * Teamsメッセージを読みやすい形式にフォーマット（LLM用）
 */
export function formatTeamsMessagesForLLM(
  messages: TeamsMessage[],
  options?: { includeReplies?: boolean; teamName?: string; channelName?: string }
): string {
  if (messages.length === 0) {
    return 'メッセージはありません。';
  }

  const header = options?.teamName && options?.channelName
    ? `📢 チーム: ${options.teamName} / チャネル: ${options.channelName}\n\n`
    : '';

  return header + messages.map((msg, index) => {
    const createdDate = new Date(msg.createdDateTime);
    const dateStr = createdDate.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const fromName = msg.from?.user?.displayName || msg.from?.application?.displayName || '不明';
    const bodyContent = msg.body?.content || '';
    
    // HTMLタグを除去（簡易版）
    const plainText = bodyContent.replace(/<[^>]*>/g, '').trim();
    const subject = msg.subject ? `件名: ${msg.subject}\n` : '';
    const replyCount = msg.replyToId ? '↩️ 返信' : '';

    let result = `[${index + 1}] ${replyCount}\n`;
    result += `👤 ${fromName}\n`;
    result += `📅 ${dateStr}\n`;
    if (subject) result += subject;
    result += `💬 ${plainText}\n`;
    
    if (msg.webUrl) {
      result += `🔗 ${msg.webUrl}\n`;
    }

    return result;
  }).join('\n---\n');
}

/**
 * 検索結果を読みやすい形式にフォーマット
 */
export function formatSearchResultsForLLM(
  results: Array<{ team: string; channel: string; messages: TeamsMessage[] }>
): string {
  if (results.length === 0) {
    return '検索結果はありませんでした。';
  }

  return results.map(result => {
    const header = `\n📢 チーム: ${result.team} / チャネル: ${result.channel}\n`;
    const messages = formatTeamsMessagesForLLM(result.messages);
    return header + messages;
  }).join('\n' + '='.repeat(80) + '\n');
}
