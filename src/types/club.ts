// ============================================
// Wine & Beer Club - 部活メンバー情報管理
// ============================================

// ユーザープロファイル
export interface ClubMember {
  id: string;
  name: string;
  displayName: string;
  avatarColor: string; // TailwindCSS gradient class
  createdAt: string;   // ISO string
}

// ============================================
// 好み情報 (Preference)
// ============================================

export interface WinePreference {
  types?: string[];         // 赤、白、ロゼ、スパークリング、オレンジ等
  grapeVarieties?: string[]; // ピノ・ノワール、シャルドネ等
  regions?: string[];        // ブルゴーニュ、トスカーナ等
  priceRange?: string;       // 「1000-3000円」「5000円以上」等
  styles?: string[];         // フルボディ、辛口、フルーティ等
  notes?: string;            // 自由記述
}

export interface BeerPreference {
  styles?: string[];         // IPA、ピルスナー、スタウト等
  bitterness?: string;       // 苦味の好み (弱い/普通/強い)
  sweetness?: string;        // 甘味の好み
  carbonation?: string;      // 炭酸の好み (弱い/普通/強い)
  brands?: string[];         // 好きなブランド
  notes?: string;            // 自由記述
}

// 拡張可能なその他の好み
export interface OtherPreference {
  drinkingStyle?: string;     // 飲み方のこだわり
  knowledgeMemos?: string[];  // 知識メモ
  favoriteShops?: ShopInfo[]; // おすすめ店情報
  [key: string]: unknown;     // 将来の拡張用
}

export interface ShopInfo {
  name: string;
  location?: string;
  genre?: string;
  rating?: number;   // 1-5
  notes?: string;
}

export interface UserPreferences {
  memberId: string;
  wine: WinePreference;
  beer: BeerPreference;
  other: OtherPreference;
  updatedAt: string; // ISO string
}

// ============================================
// 体験ログ (Experience Log)
// ============================================

export interface ExperienceLog {
  id: string;
  memberId: string;       // 記録した人
  date: string;           // 飲んだ日 (YYYY-MM-DD)
  drinkName: string;      // 銘柄名
  drinkType: 'wine' | 'beer' | 'other'; // 種類
  category?: string;      // 詳細カテゴリ (赤ワイン、IPA等)
  rating?: number;        // 評価 (1-5)
  impression?: string;    // 感想
  shop?: string;          // 飲んだお店
  companions?: string[];  // 同行者名
  price?: string;         // 価格
  imageUrl?: string;      // 写真URL (将来用)
  createdAt: string;      // 記録日時 ISO string
}

// ============================================
// Teams通知用
// ============================================

export interface TeamsWebhookConfig {
  webhookUrl: string;
  channelName?: string;
  enabled: boolean;
}

export interface ProposalNotification {
  id: string;
  title: string;
  body: string;
  targetMembers: string[];  // member IDs
  trigger: 'news' | 'event' | 'seasonal' | 'monthly_summary';
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed';
}

// ============================================
// Club Store State
// ============================================

export interface ClubState {
  members: ClubMember[];
  preferences: UserPreferences[];
  experienceLogs: ExperienceLog[];
  teamsWebhook: TeamsWebhookConfig;
  notifications: ProposalNotification[];
}

// AI Tool で使う引数型
export interface SavePreferenceArgs {
  memberId: string;
  category: 'wine' | 'beer' | 'other';
  data: Record<string, unknown>;
}

export interface SaveExperienceLogArgs {
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
}

// デフォルトメンバー
export const DEFAULT_MEMBERS: ClubMember[] = [
  {
    id: 'user-a',
    name: 'User A',
    displayName: 'User A',
    avatarColor: 'from-blue-500 to-cyan-500',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seiya',
    name: 'Seiya',
    displayName: 'Seiya',
    avatarColor: 'from-orange-500 to-red-500',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_PREFERENCES: UserPreferences[] = [
  {
    memberId: 'user-a',
    wine: {},
    beer: {},
    other: {},
    updatedAt: new Date().toISOString(),
  },
  {
    memberId: 'seiya',
    wine: {},
    beer: {},
    other: {},
    updatedAt: new Date().toISOString(),
  },
];
