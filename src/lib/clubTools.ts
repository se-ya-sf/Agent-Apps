import { ToolDefinition } from '@/types';

// ============================================
// Wine & Beer Club - AI Agent Tools
// ============================================

export const CLUB_TOOLS: ToolDefinition[] = [
  {
    name: 'club_save_preference',
    description: `ユーザーのワイン・ビールの好み情報を登録・更新します。
ユーザーが「〇〇が好き」「〇〇は苦手」などと言った時に使用してください。
AIが自然言語から構造化データに変換して保存します。
memberIdは "user-a" または "seiya" を指定してください。ユーザーが自分の好みを言った場合は "user-a"、Seiyaの好みに言及した場合は "seiya" を使います。`,
    parameters: {
      type: 'object',
      properties: {
        memberId: {
          type: 'string',
          description: 'メンバーID。"user-a"（User A本人）または "seiya"（Seiya）',
        },
        category: {
          type: 'string',
          description: '好みのカテゴリ: "wine", "beer", "other"',
          enum: ['wine', 'beer', 'other'],
        },
        data: {
          type: 'string',
          description: `JSON形式の好みデータ。カテゴリに応じた構造:
wine: {"types":["赤","白"],"grapeVarieties":["ピノ・ノワール"],"regions":["ブルゴーニュ"],"priceRange":"3000-5000円","styles":["フルボディ"],"notes":"メモ"}
beer: {"styles":["IPA","ピルスナー"],"bitterness":"強い","sweetness":"普通","carbonation":"強い","brands":["よなよなエール"],"notes":"メモ"}
other: {"drinkingStyle":"ストレート","knowledgeMemos":["メモ1"],"favoriteShops":[{"name":"店名","location":"場所","notes":"メモ"}]}`,
        },
      },
      required: ['memberId', 'category', 'data'],
    },
  },
  {
    name: 'club_get_preference',
    description: `メンバーのワイン・ビールの好み情報を取得します。
「Seiyaの好みは？」「私の好みを教えて」などの質問に使用してください。
memberIdを指定しない場合は全メンバーの情報を返します。`,
    parameters: {
      type: 'object',
      properties: {
        memberId: {
          type: 'string',
          description: 'メンバーID。"user-a" または "seiya"。省略可。',
        },
      },
      required: [],
    },
  },
  {
    name: 'club_save_experience',
    description: `飲酒体験ログを記録します。
ユーザーが「今日〇〇ワインを飲んだ」「先週Seiyaと〇〇ビールを飲んだ」等と言った時に使用してください。
自然言語から日付・銘柄・種類・感想・お店・同行者を自動抽出して記録します。
記録する本人のmemberIdを指定してください（「Seiyaと飲んだ」の場合、companionsにSeiyaを入れ、memberIdはuser-aにします）。`,
    parameters: {
      type: 'object',
      properties: {
        memberId: {
          type: 'string',
          description: 'ログを記録するメンバーのID。"user-a" または "seiya"',
        },
        date: {
          type: 'string',
          description: '飲んだ日付 (YYYY-MM-DD)。「今日」「昨日」などの場合は実際の日付に変換',
        },
        drinkName: {
          type: 'string',
          description: '飲んだ銘柄名',
        },
        drinkType: {
          type: 'string',
          description: '種類: "wine", "beer", "other"',
          enum: ['wine', 'beer', 'other'],
        },
        category: {
          type: 'string',
          description: '詳細カテゴリ（例: 赤ワイン、IPA、ハイボール等）',
        },
        rating: {
          type: 'number',
          description: '評価（1-5）。言及がなければ省略可。',
        },
        impression: {
          type: 'string',
          description: '感想・コメント',
        },
        shop: {
          type: 'string',
          description: '飲んだお店の名前',
        },
        companions: {
          type: 'string',
          description: '同行者名（カンマ区切り、例: "Seiya,田中"）',
        },
        price: {
          type: 'string',
          description: '価格（例: "3000円"）',
        },
      },
      required: ['memberId', 'date', 'drinkName', 'drinkType'],
    },
  },
  {
    name: 'club_get_experience_logs',
    description: `体験ログの履歴を取得します。
「最近何を飲んだ？」「Seiyaのワイン履歴は？」等の質問に使用してください。`,
    parameters: {
      type: 'object',
      properties: {
        memberId: {
          type: 'string',
          description: 'メンバーID。省略すると全メンバーのログを返します。',
        },
        limit: {
          type: 'number',
          description: '取得件数の上限。デフォルト20件。',
        },
      },
      required: [],
    },
  },
  {
    name: 'club_list_members',
    description: '部活メンバーの一覧を取得します。メンバーのID・名前・好みの概要を返します。',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'club_send_teams_notification',
    description: `Microsoft TeamsのIncoming Webhookに提案通知を送信します。
ワイン・ビール関連のおすすめ情報やイベント情報をメンバーに通知する際に使用します。
事前にTeams Webhook URLが設定されている必要があります。`,
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '通知のタイトル',
        },
        body: {
          type: 'string',
          description: '通知本文（Markdown形式可）',
        },
        mentionMembers: {
          type: 'string',
          description: '通知対象メンバーID（カンマ区切り）。例: "user-a,seiya"',
        },
      },
      required: ['title', 'body'],
    },
  },
];

// ============================================
// Tool Execution
// ============================================

export async function executeClubTool(
  toolName: string,
  args: Record<string, unknown>,
  clubStore: {
    members: { id: string; name: string; displayName: string }[];
    getPreferences: (memberId: string) => unknown;
    setPreference: (memberId: string, category: 'wine' | 'beer' | 'other', data: Record<string, unknown>) => void;
    addExperienceLog: (log: {
      memberId: string;
      date: string;
      drinkName: string;
      drinkType: 'wine' | 'beer' | 'other';
      category?: string;
      rating?: number;
      impression?: string;
      shop?: string;
      companions?: string[];
      price?: string;
    }) => string;
    getExperienceLogs: (memberId?: string) => Array<{
      id: string;
      memberId: string;
      date: string;
      drinkName: string;
      drinkType: string;
      category?: string;
      rating?: number;
      impression?: string;
      shop?: string;
      companions?: string[];
      price?: string;
      createdAt: string;
    }>;
    getMemberSummary: (memberId: string) => string;
    getAllMembersSummary: () => string;
    teamsWebhook: { webhookUrl: string; enabled: boolean };
  }
): Promise<string> {
  switch (toolName) {
    case 'club_save_preference': {
      const memberId = args.memberId as string;
      const category = args.category as 'wine' | 'beer' | 'other';
      let data: Record<string, unknown>;
      try {
        data = typeof args.data === 'string' ? JSON.parse(args.data) : (args.data as Record<string, unknown>);
      } catch {
        return JSON.stringify({ error: 'data のJSONパースに失敗しました', input: args.data });
      }

      const member = clubStore.members.find((m) => m.id === memberId);
      if (!member) {
        return JSON.stringify({ error: `メンバーが見つかりません: ${memberId}`, availableMembers: clubStore.members.map(m => `${m.id}: ${m.displayName}`) });
      }

      clubStore.setPreference(memberId, category, data);
      return JSON.stringify({
        success: true,
        message: `${member.displayName} の${category === 'wine' ? 'ワイン' : category === 'beer' ? 'ビール' : 'その他'}の好みを更新しました`,
        updatedData: data,
      });
    }

    case 'club_get_preference': {
      const memberId = args.memberId as string | undefined;
      if (memberId) {
        const summary = clubStore.getMemberSummary(memberId);
        return summary;
      }
      return clubStore.getAllMembersSummary();
    }

    case 'club_save_experience': {
      const memberId = args.memberId as string;
      const member = clubStore.members.find((m) => m.id === memberId);
      if (!member) {
        return JSON.stringify({ error: `メンバーが見つかりません: ${memberId}` });
      }

      const companions = args.companions
        ? (args.companions as string).split(',').map((s: string) => s.trim())
        : undefined;

      const logId = clubStore.addExperienceLog({
        memberId,
        date: args.date as string,
        drinkName: args.drinkName as string,
        drinkType: args.drinkType as 'wine' | 'beer' | 'other',
        category: args.category as string | undefined,
        rating: args.rating as number | undefined,
        impression: args.impression as string | undefined,
        shop: args.shop as string | undefined,
        companions,
        price: args.price as string | undefined,
      });

      return JSON.stringify({
        success: true,
        message: `${member.displayName} の体験ログを記録しました`,
        logId,
        data: {
          date: args.date,
          drinkName: args.drinkName,
          drinkType: args.drinkType,
          category: args.category,
          rating: args.rating,
          impression: args.impression,
          shop: args.shop,
          companions,
        },
      });
    }

    case 'club_get_experience_logs': {
      const memberId = args.memberId as string | undefined;
      const limit = (args.limit as number) || 20;
      const logs = clubStore.getExperienceLogs(memberId).slice(0, limit);

      if (logs.length === 0) {
        const target = memberId
          ? clubStore.members.find((m) => m.id === memberId)?.displayName || memberId
          : '全メンバー';
        return JSON.stringify({
          message: `${target}の体験ログはまだありません。`,
          count: 0,
          logs: [],
        });
      }

      return JSON.stringify({
        count: logs.length,
        logs: logs.map((log) => {
          const member = clubStore.members.find((m) => m.id === log.memberId);
          return {
            ...log,
            memberName: member?.displayName || log.memberId,
          };
        }),
      });
    }

    case 'club_list_members': {
      const membersInfo = clubStore.members.map((m) => {
        const pref = clubStore.getPreferences(m.id) as Record<string, unknown> | undefined;
        const logs = clubStore.getExperienceLogs(m.id);
        return {
          id: m.id,
          name: m.displayName,
          hasWinePreference: pref && typeof pref === 'object' && 'wine' in pref ? Object.keys(pref.wine as object).length > 0 : false,
          hasBeerPreference: pref && typeof pref === 'object' && 'beer' in pref ? Object.keys(pref.beer as object).length > 0 : false,
          experienceLogCount: logs.length,
        };
      });

      return JSON.stringify({
        count: membersInfo.length,
        members: membersInfo,
      });
    }

    case 'club_send_teams_notification': {
      const title = args.title as string;
      const body = args.body as string;
      const webhookUrl = clubStore.teamsWebhook.webhookUrl;

      if (!webhookUrl || !clubStore.teamsWebhook.enabled) {
        return JSON.stringify({
          error: 'Teams Webhook URLが設定されていないか、無効になっています。設定画面で Teams Incoming Webhook URL を設定してください。',
        });
      }

      try {
        // Adaptive Card format for Teams Incoming Webhook
        const card = {
          type: 'message',
          attachments: [
            {
              contentType: 'application/vnd.microsoft.card.adaptive',
              contentUrl: null,
              content: {
                $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                type: 'AdaptiveCard',
                version: '1.4',
                body: [
                  {
                    type: 'TextBlock',
                    size: 'Large',
                    weight: 'Bolder',
                    text: title,
                    wrap: true,
                  },
                  {
                    type: 'TextBlock',
                    text: body,
                    wrap: true,
                  },
                  {
                    type: 'TextBlock',
                    text: `Sent by Wine & Beer Club Agent - ${new Date().toLocaleString('ja-JP')}`,
                    size: 'Small',
                    isSubtle: true,
                    wrap: true,
                  },
                ],
              },
            },
          ],
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(card),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return JSON.stringify({
            error: `Teams通知の送信に失敗しました: ${response.status} - ${errorText}`,
          });
        }

        return JSON.stringify({
          success: true,
          message: 'Teamsに通知を送信しました',
          title,
        });
      } catch (error) {
        return JSON.stringify({
          error: `Teams通知エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    default:
      return `Unknown club tool: ${toolName}`;
  }
}
