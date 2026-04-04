'use client';

import { useState } from 'react';
import { useClubStore } from '@/store/useClubStore';
import Sidebar from '@/components/Sidebar';
import SettingsModal from '@/components/SettingsModal';
import {
  Wine,
  Beer,
  User,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  ArrowLeft,
  Star,
  MapPin,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

function PreferenceSection({
  title,
  icon,
  data,
  isEmpty,
}: {
  title: string;
  icon: React.ReactNode;
  data: Record<string, unknown>;
  isEmpty: boolean;
}) {
  const [open, setOpen] = useState(!isEmpty);

  const renderValue = (key: string, value: unknown) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      // ShopInfo array
      if (key === 'favoriteShops' && typeof value[0] === 'object') {
        return (
          <div className="space-y-1">
            {value.map((shop: { name: string; location?: string; notes?: string }, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span className="font-medium">{shop.name}</span>
                {shop.location && <span className="text-slate-500">({shop.location})</span>}
                {shop.notes && <span className="text-slate-400">- {shop.notes}</span>}
              </div>
            ))}
          </div>
        );
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v: string, i: number) => (
            <span
              key={i}
              className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium"
            >
              {v}
            </span>
          ))}
        </div>
      );
    }
    if (typeof value === 'string' && value.length > 0) {
      return <span className="text-sm text-slate-700 dark:text-slate-300">{value}</span>;
    }
    return null;
  };

  const LABEL_MAP: Record<string, string> = {
    types: '種別',
    grapeVarieties: 'ブドウ品種',
    regions: '産地',
    priceRange: '価格帯',
    styles: 'スタイル',
    notes: 'メモ',
    bitterness: '苦味',
    sweetness: '甘味',
    carbonation: '炭酸',
    brands: 'ブランド',
    drinkingStyle: '飲み方',
    knowledgeMemos: '知識メモ',
    favoriteShops: 'おすすめ店',
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium text-slate-800 dark:text-white">{title}</span>
          {isEmpty && (
            <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-full">
              未登録
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="p-4 space-y-3">
          {isEmpty ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              まだ登録されていません。チャットで「〇〇が好き」と話しかけると自動で登録されます。
            </p>
          ) : (
            Object.entries(data).map(([key, value]) => {
              const rendered = renderValue(key, value);
              if (!rendered) return null;
              return (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    {LABEL_MAP[key] || key}
                  </span>
                  {rendered}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function MemberCard({ memberId }: { memberId: string }) {
  const { getMember, getPreferences, getExperienceLogs } = useClubStore();
  const member = getMember(memberId);
  const prefs = getPreferences(memberId);
  const logs = getExperienceLogs(memberId);

  if (!member) return null;

  const wineEmpty = !prefs?.wine || Object.keys(prefs.wine).length === 0;
  const beerEmpty = !prefs?.beer || Object.keys(prefs.beer).length === 0;
  const otherEmpty = !prefs?.other || Object.keys(prefs.other).length === 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Member Header */}
      <div className={`bg-gradient-to-r ${member.avatarColor} p-6`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{member.displayName}</h2>
            <p className="text-white/70 text-sm">ID: {member.id}</p>
          </div>
        </div>
        {/* Stats */}
        <div className="flex gap-6 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{logs.length}</p>
            <p className="text-xs text-white/70">体験ログ</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {(wineEmpty ? 0 : 1) + (beerEmpty ? 0 : 1) + (otherEmpty ? 0 : 1)}
            </p>
            <p className="text-xs text-white/70">登録カテゴリ</p>
          </div>
          {logs.length > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-white flex items-center gap-1">
                <Star className="w-5 h-5" />
                {(
                  logs.filter((l) => l.rating).reduce((sum, l) => sum + (l.rating || 0), 0) /
                  logs.filter((l) => l.rating).length || 0
                ).toFixed(1)}
              </p>
              <p className="text-xs text-white/70">平均評価</p>
            </div>
          )}
        </div>
      </div>

      {/* Preferences */}
      <div className="p-6 space-y-4">
        <PreferenceSection
          title="ワインの好み"
          icon={<Wine className="w-5 h-5 text-red-500" />}
          data={(prefs?.wine || {}) as Record<string, unknown>}
          isEmpty={wineEmpty}
        />
        <PreferenceSection
          title="ビールの好み"
          icon={<Beer className="w-5 h-5 text-amber-500" />}
          data={(prefs?.beer || {}) as Record<string, unknown>}
          isEmpty={beerEmpty}
        />
        <PreferenceSection
          title="その他"
          icon={<BookOpen className="w-5 h-5 text-blue-500" />}
          data={(prefs?.other || {}) as Record<string, unknown>}
          isEmpty={otherEmpty}
        />

        {/* Recent Logs */}
        {logs.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              最近の体験 ({logs.length}件)
            </h3>
            <div className="space-y-2">
              {logs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                >
                  {log.drinkType === 'wine' ? (
                    <Wine className="w-4 h-4 text-red-500" />
                  ) : log.drinkType === 'beer' ? (
                    <Beer className="w-4 h-4 text-amber-500" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-blue-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                      {log.drinkName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {log.date}
                      {log.shop && ` @ ${log.shop}`}
                      {log.companions?.length ? ` with ${log.companions.join(', ')}` : ''}
                    </p>
                  </div>
                  {log.rating && (
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-xs font-medium">{log.rating}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MembersPage() {
  const { members, addMember, removeMember } = useClubStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');

  const COLORS = [
    'from-emerald-500 to-teal-500',
    'from-violet-500 to-purple-500',
    'from-rose-500 to-pink-500',
    'from-sky-500 to-blue-500',
    'from-amber-500 to-orange-500',
  ];

  const handleAdd = () => {
    if (!newName.trim()) return;
    addMember({
      name: newName.trim(),
      displayName: newName.trim(),
      avatarColor: COLORS[members.length % COLORS.length],
    });
    setNewName('');
    setShowAddForm(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50">
          <Link
            href="/"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">メンバー & 好み管理</h1>
            <p className="text-sm text-slate-500">部活メンバーのプロフィールと好みを管理</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            メンバー追加
          </button>
        </header>

        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Add Member Form */}
          {showAddForm && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 animate-in">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">新しいメンバーを追加</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder="メンバー名（例: Tanaka）"
                  className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-slate-800 dark:text-white placeholder-slate-400"
                />
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 text-white rounded-xl font-medium transition-colors"
                >
                  追加
                </button>
              </div>
            </div>
          )}

          {/* Member Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {members.map((member) => (
              <MemberCard key={member.id} memberId={member.id} />
            ))}
          </div>

          {members.length === 0 && (
            <div className="text-center py-20">
              <User className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">
                まだメンバーがいません
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                上の「メンバー追加」ボタンから追加してください
              </p>
            </div>
          )}
        </div>
      </div>
      <SettingsModal />
    </div>
  );
}
