'use client';

import { useState } from 'react';
import { useClubStore } from '@/store/useClubStore';
import Sidebar from '@/components/Sidebar';
import SettingsModal from '@/components/SettingsModal';
import {
  Wine,
  Beer,
  BookOpen,
  ArrowLeft,
  Star,
  MapPin,
  Users,
  Calendar,
  Trash2,
  Filter,
  User,
} from 'lucide-react';
import Link from 'next/link';

export default function LogsPage() {
  const { experienceLogs, members, deleteExperienceLog } = useClubStore();
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = experienceLogs.filter((log) => {
    if (filterMember !== 'all' && log.memberId !== filterMember) return false;
    if (filterType !== 'all' && log.drinkType !== filterType) return false;
    return true;
  });

  const getMemberName = (memberId: string) => {
    return members.find((m) => m.id === memberId)?.displayName || memberId;
  };

  const getMemberColor = (memberId: string) => {
    return members.find((m) => m.id === memberId)?.avatarColor || 'from-slate-400 to-slate-500';
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
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">体験ログ</h1>
            <p className="text-sm text-slate-500">ワイン・ビールの飲酒体験を記録・閲覧</p>
          </div>
        </header>

        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{experienceLogs.length}</p>
              <p className="text-xs text-slate-500 mt-1">総ログ数</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-2xl font-bold text-red-500">{experienceLogs.filter(l => l.drinkType === 'wine').length}</p>
              <p className="text-xs text-slate-500 mt-1">ワイン</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-2xl font-bold text-amber-500">{experienceLogs.filter(l => l.drinkType === 'beer').length}</p>
              <p className="text-xs text-slate-500 mt-1">ビール</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-2xl font-bold text-blue-500">{experienceLogs.filter(l => l.drinkType === 'other').length}</p>
              <p className="text-xs text-slate-500 mt-1">その他</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="all">全メンバー</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.displayName}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="all">全種類</option>
              <option value="wine">ワイン</option>
              <option value="beer">ビール</option>
              <option value="other">その他</option>
            </select>
            <span className="text-sm text-slate-500">{filteredLogs.length} 件</span>
          </div>

          {/* Log List */}
          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">
                  体験ログがありません
                </h3>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                  チャットで「今日〇〇ワインを飲んだ」のように話しかけると、AIが自動的に記録します
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      log.drinkType === 'wine'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : log.drinkType === 'beer'
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      {log.drinkType === 'wine' ? (
                        <Wine className="w-6 h-6 text-red-500" />
                      ) : log.drinkType === 'beer' ? (
                        <Beer className="w-6 h-6 text-amber-500" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-blue-500" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                          {log.drinkName}
                        </h3>
                        {log.category && (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                            {log.category}
                          </span>
                        )}
                        {log.rating && (
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < log.rating! ? 'text-amber-400 fill-current' : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {log.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${getMemberColor(log.memberId)}`} />
                          {getMemberName(log.memberId)}
                        </div>
                        {log.shop && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {log.shop}
                          </div>
                        )}
                        {log.companions && log.companions.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {log.companions.join(', ')}
                          </div>
                        )}
                        {log.price && (
                          <span className="text-slate-400">{log.price}</span>
                        )}
                      </div>

                      {log.impression && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                          {log.impression}
                        </p>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm('このログを削除しますか？')) {
                          deleteExperienceLog(log.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <SettingsModal />
    </div>
  );
}
