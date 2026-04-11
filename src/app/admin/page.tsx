'use client';

import { useState } from 'react';
import { useClubStore } from '@/store/useClubStore';
import Sidebar from '@/components/Sidebar';
import SettingsModal from '@/components/SettingsModal';
import {
  KnowledgeCategory,
  KnowledgeEntry,
  ADMIN_USERS,
} from '@/types/club';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Store,
  MessageCircle,
  Lightbulb,
  Calendar,
  Tag,
  User,
  Search,
  Filter,
  Shield,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Quote,
  MapPin,
  Star,
} from 'lucide-react';
import Link from 'next/link';

const CATEGORY_CONFIG: Record<KnowledgeCategory, { label: string; icon: typeof Store; color: string; bgColor: string }> = {
  shop: { label: '店舗情報', icon: Store, color: 'text-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  review: { label: 'レビュー', icon: MessageCircle, color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  tips: { label: '知識・Tips', icon: Lightbulb, color: 'text-amber-500', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  event: { label: 'イベント', icon: Calendar, color: 'text-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  other: { label: 'その他', icon: Tag, color: 'text-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-800' },
};

// ナレッジ登録フォーム
function KnowledgeForm({
  onSubmit,
  onCancel,
  initialData,
}: {
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  initialData?: KnowledgeEntry;
}) {
  const [category, setCategory] = useState<KnowledgeCategory>(initialData?.category || 'shop');
  const [authorId, setAuthorId] = useState(initialData?.authorId || 'seiya');
  const [authorComment, setAuthorComment] = useState(initialData?.authorComment || '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');

  // Helper to safely extract fields from initialData
  const d = initialData as unknown as Record<string, unknown> | undefined;

  // Shop fields
  const [shopName, setShopName] = useState(d?.shopName as string || '');
  const [area, setArea] = useState(d?.area as string || '');
  const [genre, setGenre] = useState(d?.genre as string || '');
  const [access, setAccess] = useState(d?.access as string || '');
  const [menu, setMenu] = useState(Array.isArray(d?.menu) ? (d.menu as string[]).join(', ') : '');
  const [priceRange, setPriceRange] = useState(d?.priceRange as string || '');
  const [description, setDescription] = useState(d?.description as string || '');

  // Review fields
  const [targetName, setTargetName] = useState(d?.targetName as string || '');
  const [targetType, setTargetType] = useState(d?.targetType as string || '');
  const [rating, setRating] = useState(d?.rating as number || 0);

  // Tips / General fields
  const [title, setTitle] = useState(d?.title as string || '');
  const [content, setContent] = useState(d?.content as string || '');

  const handleSubmit = () => {
    const base = {
      category,
      authorId,
      authorComment: authorComment || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    };

    if (category === 'shop') {
      if (!shopName.trim()) { alert('店舗名を入力してください'); return; }
      onSubmit({
        ...base,
        shopName: shopName.trim(),
        area: area.trim() || undefined,
        genre: genre.trim() || undefined,
        access: access.trim() || undefined,
        menu: menu ? menu.split(',').map((m) => m.trim()).filter(Boolean) : undefined,
        priceRange: priceRange.trim() || undefined,
        description: description.trim() || undefined,
      });
    } else if (category === 'review') {
      if (!targetName.trim() || !authorComment.trim()) { alert('対象名とコメントを入力してください'); return; }
      onSubmit({
        ...base,
        targetName: targetName.trim(),
        targetType: targetType.trim() || undefined,
        rating: rating || undefined,
        authorComment: authorComment.trim(),
      });
    } else {
      if (!title.trim() || !content.trim()) { alert('タイトルと内容を入力してください'); return; }
      onSubmit({
        ...base,
        title: title.trim(),
        content: content.trim(),
      });
    }
  };

  const inputClass = "w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          {initialData ? 'ナレッジ編集' : '新規ナレッジ登録'}
        </h3>
        <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Category & Author */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">カテゴリ</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as KnowledgeCategory)} className={inputClass}>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">登録者</label>
          <select value={authorId} onChange={(e) => setAuthorId(e.target.value)} className={inputClass}>
            {ADMIN_USERS.map((user) => (
              <option key={user.id} value={user.id}>{user.displayName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category-specific fields */}
      {category === 'shop' && (
        <div className="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">店舗名 *</label>
              <input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Beer Bar ABC" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">エリア</label>
              <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="渋谷" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ジャンル</label>
              <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="ビアバー" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">価格帯</label>
              <input value={priceRange} onChange={(e) => setPriceRange(e.target.value)} placeholder="3000-5000円" className={inputClass} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">アクセス</label>
            <input value={access} onChange={(e) => setAccess(e.target.value)} placeholder="渋谷駅ハチ公口から徒歩5分" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">おすすめメニュー（カンマ区切り）</label>
            <input value={menu} onChange={(e) => setMenu(e.target.value)} placeholder="生ビール, フィッシュ&チップス, 自家製ソーセージ" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">説明</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="店舗の特徴やおすすめポイント" rows={3} className={inputClass} />
          </div>
        </div>
      )}

      {category === 'review' && (
        <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">対象名 *</label>
              <input value={targetName} onChange={(e) => setTargetName(e.target.value)} placeholder="シャトー・マルゴー 2018" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">タイプ</label>
              <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className={inputClass}>
                <option value="">選択してください</option>
                <option value="wine">ワイン</option>
                <option value="beer">ビール</option>
                <option value="shop">店舗</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">評価</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={`p-2 rounded-lg transition-colors ${n <= rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                >
                  <Star className={`w-6 h-6 ${n <= rating ? 'fill-current' : ''}`} />
                </button>
              ))}
              {rating > 0 && (
                <button onClick={() => setRating(0)} className="text-xs text-slate-400 hover:text-slate-600 ml-2">
                  クリア
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {(category === 'tips' || category === 'event' || category === 'other') && (
        <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">タイトル *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ビールの注ぎ方の極意" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">内容 *</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="詳しい内容を入力" rows={4} className={inputClass} />
          </div>
        </div>
      )}

      {/* Author Comment (quote) */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Quote className="w-4 h-4 text-purple-500" />
          有識者コメント（AIが引用表示します）{category === 'review' ? ' *' : ''}
        </label>
        <textarea
          value={authorComment}
          onChange={(e) => setAuthorComment(e.target.value)}
          placeholder="例: ここの店舗の最大のストロングポイントは徹底したグラス洗浄とマイスターによる注ぎ技術が圧倒的でビール初級者でも甘さを感じられる一杯！"
          rows={3}
          className={inputClass}
        />
        {authorComment && (
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
              {ADMIN_USERS.find(u => u.id === authorId)?.displayName || authorId} のコメント:
            </p>
            <p className="text-sm text-purple-800 dark:text-purple-200 italic">&ldquo;{authorComment}&rdquo;</p>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Tag className="w-4 h-4" />
          タグ（カンマ区切り）
        </label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ビール, 渋谷, おすすめ" className={inputClass} />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors">
          キャンセル
        </button>
        <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium shadow-md transition-all">
          <Save className="w-4 h-4" />
          {initialData ? '更新' : '登録'}
        </button>
      </div>
    </div>
  );
}

// ナレッジカード
function KnowledgeCard({ entry, onEdit, onDelete }: { entry: KnowledgeEntry; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const config = CATEGORY_CONFIG[entry.category];
  const Icon = config.icon;
  const authorName = ADMIN_USERS.find(u => u.id === entry.authorId)?.displayName || entry.authorId;

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all">
      <div className="flex items-start gap-4 p-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bgColor}`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              {entry.category === 'shop' && 'shopName' in entry ? entry.shopName :
               entry.category === 'review' && 'targetName' in entry ? entry.targetName :
               'title' in entry ? entry.title : '(no title)'}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} font-medium`}>
              {config.label}
            </span>
            {'rating' in entry && entry.rating && (
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < (entry.rating || 0) ? 'text-amber-400 fill-current' : 'text-slate-300'}`} />
                ))}
              </div>
            )}
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {authorName}
            </div>
            {'area' in entry && entry.area && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {entry.area}
              </div>
            )}
            {'genre' in entry && entry.genre && <span>{entry.genre}</span>}
            {'targetType' in entry && entry.targetType && <span>{entry.targetType}</span>}
          </div>

          {/* Author Comment (quote) */}
          {entry.authorComment && (
            <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
              <p className="text-sm text-purple-800 dark:text-purple-200 italic">
                &ldquo;{entry.authorComment}&rdquo;
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                &mdash; {authorName}
              </p>
            </div>
          )}

          {/* Expandable details */}
          {expanded && (
            <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              {'access' in entry && entry.access && <p><strong>アクセス:</strong> {entry.access}</p>}
              {'menu' in entry && entry.menu?.length && <p><strong>メニュー:</strong> {entry.menu.join(', ')}</p>}
              {'priceRange' in entry && entry.priceRange && <p><strong>価格帯:</strong> {entry.priceRange}</p>}
              {'description' in entry && entry.description && <p>{entry.description}</p>}
              {'content' in entry && entry.content && <p>{entry.content}</p>}
            </div>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.tags.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={() => { if (confirm('削除しますか？')) onDelete(); }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { knowledgeEntries, addKnowledge, updateKnowledge, deleteKnowledge } = useClubStore();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | undefined>();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAuthor, setFilterAuthor] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = knowledgeEntries.filter((e) => {
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (filterAuthor !== 'all' && e.authorId !== filterAuthor) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fields: string[] = [];
      if ('shopName' in e) fields.push(e.shopName);
      if ('targetName' in e) fields.push(e.targetName);
      if ('title' in e) fields.push(e.title);
      if (e.authorComment) fields.push(e.authorComment);
      if (e.tags) fields.push(...e.tags);
      if (!fields.some((f) => f.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const handleSubmit = (data: Record<string, unknown>) => {
    if (editingEntry) {
      updateKnowledge(editingEntry.id, data as Partial<KnowledgeEntry>);
    } else {
      addKnowledge(data as Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'>);
    }
    setShowForm(false);
    setEditingEntry(undefined);
  };

  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
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
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">管理者ナレッジ</h1>
            </div>
            <p className="text-sm text-slate-500">有識者の知識・レビュー・店舗情報を登録 → AIが引用して回答</p>
          </div>
          <button
            onClick={() => { setEditingEntry(undefined); setShowForm(!showForm); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            ナレッジ追加
          </button>
        </header>

        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const count = knowledgeEntries.filter(e => e.category === key).length;
              const Icon = config.icon;
              return (
                <div key={key} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className="text-xs text-slate-500">{config.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${config.color}`}>{count}</p>
                </div>
              );
            })}
          </div>

          {/* Form */}
          {showForm && (
            <KnowledgeForm
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingEntry(undefined); }}
              initialData={editingEntry}
            />
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="all">全カテゴリ</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <select
              value={filterAuthor}
              onChange={(e) => setFilterAuthor(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="all">全登録者</option>
              {ADMIN_USERS.map((user) => (
                <option key={user.id} value={user.id}>{user.displayName}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ナレッジを検索..."
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <span className="text-sm text-slate-500">{filteredEntries.length} 件</span>
          </div>

          {/* Knowledge List */}
          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                <Lightbulb className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">
                  ナレッジがまだありません
                </h3>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                  「ナレッジ追加」ボタンから店舗情報やレビュー、知識を登録してください。<br />
                  AIが回答時に有識者コメントを引用して返します。
                </p>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <KnowledgeCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => handleEdit(entry)}
                  onDelete={() => deleteKnowledge(entry.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
      <SettingsModal />
    </div>
  );
}
