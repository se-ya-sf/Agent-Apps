'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ClubMember,
  UserPreferences,
  ExperienceLog,
  TeamsWebhookConfig,
  ProposalNotification,
  DEFAULT_MEMBERS,
  DEFAULT_PREFERENCES,
  WinePreference,
  BeerPreference,
  OtherPreference,
} from '@/types/club';

interface ClubStoreState {
  // Data
  members: ClubMember[];
  preferences: UserPreferences[];
  experienceLogs: ExperienceLog[];
  teamsWebhook: TeamsWebhookConfig;
  notifications: ProposalNotification[];

  // UI State
  selectedMemberId: string | null;

  // Member Actions
  addMember: (member: Omit<ClubMember, 'id' | 'createdAt'>) => string;
  removeMember: (memberId: string) => void;
  updateMember: (memberId: string, updates: Partial<ClubMember>) => void;
  getMember: (memberId: string) => ClubMember | undefined;
  getMemberByName: (name: string) => ClubMember | undefined;
  setSelectedMember: (memberId: string | null) => void;

  // Preference Actions
  getPreferences: (memberId: string) => UserPreferences | undefined;
  updateWinePreference: (memberId: string, data: Partial<WinePreference>) => void;
  updateBeerPreference: (memberId: string, data: Partial<BeerPreference>) => void;
  updateOtherPreference: (memberId: string, data: Partial<OtherPreference>) => void;
  setPreference: (memberId: string, category: 'wine' | 'beer' | 'other', data: Record<string, unknown>) => void;

  // Experience Log Actions
  addExperienceLog: (log: Omit<ExperienceLog, 'id' | 'createdAt'>) => string;
  getExperienceLogs: (memberId?: string) => ExperienceLog[];
  deleteExperienceLog: (logId: string) => void;

  // Teams Webhook
  setTeamsWebhook: (config: Partial<TeamsWebhookConfig>) => void;

  // Notification Actions
  addNotification: (notification: Omit<ProposalNotification, 'id'>) => string;
  updateNotification: (id: string, updates: Partial<ProposalNotification>) => void;

  // Summary / Query
  getMemberSummary: (memberId: string) => string;
  getAllMembersSummary: () => string;
}

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

export const useClubStore = create<ClubStoreState>()(
  persist(
    (set, get) => ({
      members: DEFAULT_MEMBERS,
      preferences: DEFAULT_PREFERENCES,
      experienceLogs: [],
      teamsWebhook: { webhookUrl: '', enabled: false },
      notifications: [],
      selectedMemberId: null,

      // ============ Member Actions ============
      addMember: (member) => {
        const id = generateId();
        const newMember: ClubMember = {
          ...member,
          id,
          createdAt: new Date().toISOString(),
        };
        const newPref: UserPreferences = {
          memberId: id,
          wine: {},
          beer: {},
          other: {},
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          members: [...state.members, newMember],
          preferences: [...state.preferences, newPref],
        }));
        return id;
      },

      removeMember: (memberId) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== memberId),
          preferences: state.preferences.filter((p) => p.memberId !== memberId),
          experienceLogs: state.experienceLogs.filter((l) => l.memberId !== memberId),
        }));
      },

      updateMember: (memberId, updates) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, ...updates } : m
          ),
        }));
      },

      getMember: (memberId) => {
        return get().members.find((m) => m.id === memberId);
      },

      getMemberByName: (name) => {
        const lowerName = name.toLowerCase();
        return get().members.find(
          (m) =>
            m.name.toLowerCase() === lowerName ||
            m.displayName.toLowerCase() === lowerName
        );
      },

      setSelectedMember: (memberId) => {
        set({ selectedMemberId: memberId });
      },

      // ============ Preference Actions ============
      getPreferences: (memberId) => {
        return get().preferences.find((p) => p.memberId === memberId);
      },

      updateWinePreference: (memberId, data) => {
        set((state) => ({
          preferences: state.preferences.map((p) =>
            p.memberId === memberId
              ? {
                  ...p,
                  wine: { ...p.wine, ...data },
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      updateBeerPreference: (memberId, data) => {
        set((state) => ({
          preferences: state.preferences.map((p) =>
            p.memberId === memberId
              ? {
                  ...p,
                  beer: { ...p.beer, ...data },
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      updateOtherPreference: (memberId, data) => {
        set((state) => ({
          preferences: state.preferences.map((p) =>
            p.memberId === memberId
              ? {
                  ...p,
                  other: { ...p.other, ...data },
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      setPreference: (memberId, category, data) => {
        set((state) => ({
          preferences: state.preferences.map((p) => {
            if (p.memberId !== memberId) return p;
            const updated = { ...p, updatedAt: new Date().toISOString() };
            if (category === 'wine') {
              // Merge arrays intelligently
              const merged: Record<string, unknown> = { ...p.wine };
              for (const [key, value] of Object.entries(data)) {
                if (Array.isArray(value) && Array.isArray(merged[key])) {
                  // Merge arrays without duplicates
                  merged[key] = [...new Set([...(merged[key] as string[]), ...value])];
                } else {
                  merged[key] = value;
                }
              }
              updated.wine = merged as typeof p.wine;
            } else if (category === 'beer') {
              const merged: Record<string, unknown> = { ...p.beer };
              for (const [key, value] of Object.entries(data)) {
                if (Array.isArray(value) && Array.isArray(merged[key])) {
                  merged[key] = [...new Set([...(merged[key] as string[]), ...value])];
                } else {
                  merged[key] = value;
                }
              }
              updated.beer = merged as typeof p.beer;
            } else {
              const merged: Record<string, unknown> = { ...p.other };
              for (const [key, value] of Object.entries(data)) {
                if (Array.isArray(value) && Array.isArray(merged[key])) {
                  merged[key] = [...new Set([...(merged[key] as string[]), ...value])];
                } else {
                  merged[key] = value;
                }
              }
              updated.other = merged as typeof p.other;
            }
            return updated;
          }),
        }));
      },

      // ============ Experience Log Actions ============
      addExperienceLog: (log) => {
        const id = generateId();
        const newLog: ExperienceLog = {
          ...log,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          experienceLogs: [newLog, ...state.experienceLogs],
        }));
        return id;
      },

      getExperienceLogs: (memberId?) => {
        const logs = get().experienceLogs;
        if (memberId) {
          return logs.filter((l) => l.memberId === memberId);
        }
        return logs;
      },

      deleteExperienceLog: (logId) => {
        set((state) => ({
          experienceLogs: state.experienceLogs.filter((l) => l.id !== logId),
        }));
      },

      // ============ Teams Webhook ============
      setTeamsWebhook: (config) => {
        set((state) => ({
          teamsWebhook: { ...state.teamsWebhook, ...config },
        }));
      },

      // ============ Notifications ============
      addNotification: (notification) => {
        const id = generateId();
        set((state) => ({
          notifications: [{ ...notification, id }, ...state.notifications],
        }));
        return id;
      },

      updateNotification: (id, updates) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          ),
        }));
      },

      // ============ Summary / Query ============
      getMemberSummary: (memberId) => {
        const state = get();
        const member = state.members.find((m) => m.id === memberId);
        if (!member) return `メンバーが見つかりません (ID: ${memberId})`;

        const pref = state.preferences.find((p) => p.memberId === memberId);
        const logs = state.experienceLogs.filter((l) => l.memberId === memberId);

        let summary = `## ${member.displayName} のプロフィール\n\n`;

        // Wine preferences
        if (pref?.wine && Object.keys(pref.wine).length > 0) {
          summary += `### ワインの好み\n`;
          if (pref.wine.types?.length) summary += `- 種別: ${pref.wine.types.join(', ')}\n`;
          if (pref.wine.grapeVarieties?.length) summary += `- ブドウ品種: ${pref.wine.grapeVarieties.join(', ')}\n`;
          if (pref.wine.regions?.length) summary += `- 産地: ${pref.wine.regions.join(', ')}\n`;
          if (pref.wine.priceRange) summary += `- 価格帯: ${pref.wine.priceRange}\n`;
          if (pref.wine.styles?.length) summary += `- スタイル: ${pref.wine.styles.join(', ')}\n`;
          if (pref.wine.notes) summary += `- メモ: ${pref.wine.notes}\n`;
          summary += '\n';
        } else {
          summary += `### ワインの好み\nまだ登録されていません。\n\n`;
        }

        // Beer preferences
        if (pref?.beer && Object.keys(pref.beer).length > 0) {
          summary += `### ビールの好み\n`;
          if (pref.beer.styles?.length) summary += `- スタイル: ${pref.beer.styles.join(', ')}\n`;
          if (pref.beer.bitterness) summary += `- 苦味: ${pref.beer.bitterness}\n`;
          if (pref.beer.sweetness) summary += `- 甘味: ${pref.beer.sweetness}\n`;
          if (pref.beer.carbonation) summary += `- 炭酸: ${pref.beer.carbonation}\n`;
          if (pref.beer.brands?.length) summary += `- ブランド: ${pref.beer.brands.join(', ')}\n`;
          if (pref.beer.notes) summary += `- メモ: ${pref.beer.notes}\n`;
          summary += '\n';
        } else {
          summary += `### ビールの好み\nまだ登録されていません。\n\n`;
        }

        // Other
        if (pref?.other && Object.keys(pref.other).length > 0) {
          summary += `### その他\n`;
          if (pref.other.drinkingStyle) summary += `- 飲み方: ${pref.other.drinkingStyle}\n`;
          if (pref.other.knowledgeMemos?.length) summary += `- 知識メモ: ${pref.other.knowledgeMemos.join('; ')}\n`;
          if (pref.other.favoriteShops?.length) {
            summary += `- おすすめ店:\n`;
            for (const shop of pref.other.favoriteShops) {
              summary += `  - ${shop.name}${shop.location ? ` (${shop.location})` : ''}${shop.notes ? `: ${shop.notes}` : ''}\n`;
            }
          }
          summary += '\n';
        }

        // Recent logs
        if (logs.length > 0) {
          summary += `### 最近の体験ログ (${logs.length}件)\n`;
          const recentLogs = logs.slice(0, 10);
          for (const log of recentLogs) {
            summary += `- ${log.date}: ${log.drinkName}`;
            if (log.category) summary += ` (${log.category})`;
            if (log.rating) summary += ` ★${log.rating}`;
            if (log.shop) summary += ` @ ${log.shop}`;
            if (log.impression) summary += ` - ${log.impression}`;
            if (log.companions?.length) summary += ` [同行: ${log.companions.join(', ')}]`;
            summary += '\n';
          }
        } else {
          summary += `### 体験ログ\nまだ記録がありません。\n`;
        }

        return summary;
      },

      getAllMembersSummary: () => {
        const state = get();
        let summary = '# 部活メンバー一覧\n\n';
        for (const member of state.members) {
          summary += get().getMemberSummary(member.id) + '\n---\n\n';
        }
        return summary;
      },
    }),
    {
      name: 'wine-beer-club-storage-v1',
      partialize: (state) => ({
        members: state.members,
        preferences: state.preferences,
        experienceLogs: state.experienceLogs,
        teamsWebhook: state.teamsWebhook,
        notifications: state.notifications,
      }),
    }
  )
);
