'use client';

/**
 * Admin Dashboard - 管理者専用ページ
 * ユーザーの進化履歴を分析・可視化
 */

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { isAdmin, type EvolutionEvent, type UserSummary, getLocalHistory } from '@/lib/analytics/evolutionTracker';

interface AnalyticsSummary {
    totalUsers: number;
    totalEvents: number;
    message?: string;
    isLocalMode?: boolean;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [events, setEvents] = useState<EvolutionEvent[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'users' | 'events'>('summary');

    const userEmail = session?.user?.email;
    const isAdminUser = isAdmin(userEmail);

    // 初期データの取得
    useEffect(() => {
        if (status === 'loading') return;
        if (!isAdminUser) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // サマリーを取得
                const summaryRes = await fetch('/api/analytics?type=summary');
                if (summaryRes.ok) {
                    const summaryData = await summaryRes.json();
                    setSummary(summaryData);

                    // KV not configured の場合、localStorageから直接読み取る
                    if (summaryData.message === 'KV not configured') {
                        const localHistory = getLocalHistory();

                        // ユーザー別に集計
                        const userMap = new Map<string, UserSummary>();

                        localHistory.forEach(event => {
                            const existing = userMap.get(event.userId);
                            if (existing) {
                                existing.lastSeen = Math.max(existing.lastSeen, event.timestamp);
                                existing.totalEvents += 1;
                                existing.totalGenerations = Math.max(existing.totalGenerations, event.generation);
                            } else {
                                userMap.set(event.userId, {
                                    userId: event.userId,
                                    userEmail: event.userEmail,
                                    userName: event.userName,
                                    firstSeen: event.timestamp,
                                    lastSeen: event.timestamp,
                                    totalEvents: 1,
                                    totalGenerations: event.generation,
                                });
                            }
                        });

                        const localUsers = Array.from(userMap.values());
                        localUsers.sort((a, b) => b.lastSeen - a.lastSeen);

                        // ローカルデータで上書き
                        setSummary({
                            totalUsers: localUsers.length,
                            totalEvents: localHistory.length,
                            isLocalMode: true,
                        });
                        setUsers(localUsers);
                        setEvents(localHistory);
                        setLoading(false);
                        return;
                    }
                }

                // ユーザー一覧を取得
                const usersRes = await fetch('/api/analytics?type=users');
                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    setUsers(usersData.users || []);
                }

                // 最新イベントを取得
                const eventsRes = await fetch('/api/analytics?type=events&limit=50');
                if (eventsRes.ok) {
                    const eventsData = await eventsRes.json();
                    setEvents(eventsData.events || []);
                }
            } catch (err) {
                setError('データの取得に失敗しました');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [status, isAdminUser]);

    // 認証中
    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p className="text-neutral-400">読み込み中...</p>
            </div>
        );
    }

    // 未ログインまたは管理者でない場合
    if (!session || !isAdminUser) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold text-red-500">アクセス拒否</h1>
                <p className="text-neutral-400">このページは管理者のみアクセスできます。</p>
                <a href="/" className="text-blue-400 hover:underline">
                    ← ホームに戻る
                </a>
            </div>
        );
    }

    // 日時フォーマット
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('ja-JP');
    };

    // 選択したユーザーのイベントをフィルタ
    const filteredEvents = selectedUserId
        ? events.filter(e => e.userId === selectedUserId)
        : events;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-6xl mx-auto">
                {/* ヘッダー */}
                <header className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">管理者ダッシュボード</h1>
                            <p className="text-neutral-400 mt-1">
                                進化履歴の分析・ユーザー管理
                            </p>
                        </div>
                        <a
                            href="/"
                            className="px-4 py-2 border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors"
                        >
                            ← ホームに戻る
                        </a>
                    </div>
                </header>

                {/* エラー表示 */}
                {error && (
                    <div className="mb-4 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded">
                        {error}
                    </div>
                )}

                {/* ローカルモード情報 */}
                {summary?.isLocalMode && (
                    <div className="mb-4 p-4 bg-blue-900/50 border border-blue-700 text-blue-300 rounded">
                        <strong>ℹ️ 情報:</strong> ブラウザのlocalStorageに保存されたデータを表示しています。
                    </div>
                )}

                {/* タブ */}
                <div className="flex gap-2 mb-6">
                    {(['summary', 'users', 'events'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm transition-colors ${activeTab === tab
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                                }`}
                        >
                            {tab === 'summary' && '📊 サマリー'}
                            {tab === 'users' && '👥 ユーザー'}
                            {tab === 'events' && '📜 イベント'}
                        </button>
                    ))}
                </div>

                {/* サマリータブ */}
                {activeTab === 'summary' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded">
                            <h3 className="text-neutral-400 text-sm mb-2">総ユーザー数</h3>
                            <p className="text-4xl font-bold text-orange-400">
                                {summary?.totalUsers || 0}
                            </p>
                        </div>
                        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded">
                            <h3 className="text-neutral-400 text-sm mb-2">総イベント数</h3>
                            <p className="text-4xl font-bold text-emerald-400">
                                {summary?.totalEvents || 0}
                            </p>
                        </div>
                        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded">
                            <h3 className="text-neutral-400 text-sm mb-2">平均選択数</h3>
                            <p className="text-4xl font-bold text-blue-400">
                                {summary?.totalUsers && summary.totalEvents
                                    ? (summary.totalEvents / summary.totalUsers).toFixed(1)
                                    : 0}
                            </p>
                        </div>
                    </div>
                )}

                {/* ユーザータブ */}
                {activeTab === 'users' && (
                    <div className="bg-neutral-900 border border-neutral-800 rounded overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-800">
                                <tr>
                                    <th className="text-left p-3 text-neutral-400 text-sm">ユーザー</th>
                                    <th className="text-left p-3 text-neutral-400 text-sm">初回アクセス</th>
                                    <th className="text-left p-3 text-neutral-400 text-sm">最終アクセス</th>
                                    <th className="text-left p-3 text-neutral-400 text-sm">イベント数</th>
                                    <th className="text-left p-3 text-neutral-400 text-sm">最大世代</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-neutral-500">
                                            ユーザーデータがありません
                                        </td>
                                    </tr>
                                ) : (
                                    users.map(user => (
                                        <tr
                                            key={user.userId}
                                            className="border-t border-neutral-800 hover:bg-neutral-800/50 cursor-pointer"
                                            onClick={() => {
                                                setSelectedUserId(user.userId);
                                                setActiveTab('events');
                                            }}
                                        >
                                            <td className="p-3">
                                                <div className="text-white">{user.userName || 'Anonymous'}</div>
                                                <div className="text-neutral-500 text-xs">{user.userEmail || user.userId}</div>
                                            </td>
                                            <td className="p-3 text-neutral-400 text-sm">
                                                {formatDate(user.firstSeen)}
                                            </td>
                                            <td className="p-3 text-neutral-400 text-sm">
                                                {formatDate(user.lastSeen)}
                                            </td>
                                            <td className="p-3 text-neutral-400">
                                                {user.totalEvents}
                                            </td>
                                            <td className="p-3 text-neutral-400">
                                                Gen {user.totalGenerations}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* イベントタブ */}
                {activeTab === 'events' && (
                    <div>
                        {selectedUserId && (
                            <div className="mb-4 flex items-center gap-2">
                                <span className="text-neutral-400">フィルター中:</span>
                                <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-sm rounded">
                                    {users.find(u => u.userId === selectedUserId)?.userName || selectedUserId}
                                </span>
                                <button
                                    onClick={() => setSelectedUserId(null)}
                                    className="text-neutral-500 hover:text-white"
                                >
                                    ✕ クリア
                                </button>
                            </div>
                        )}

                        <div className="space-y-2">
                            {filteredEvents.length === 0 ? (
                                <div className="p-4 text-center text-neutral-500 bg-neutral-900 border border-neutral-800 rounded">
                                    イベントデータがありません
                                </div>
                            ) : (
                                filteredEvents.map((event, index) => (
                                    <div
                                        key={`${event.timestamp}-${index}`}
                                        className="bg-neutral-900 border border-neutral-800 p-4 rounded"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 text-xs rounded ${event.actionType === 'select'
                                                            ? 'bg-emerald-900/50 text-emerald-300'
                                                            : event.actionType === 'auto-explore'
                                                                ? 'bg-blue-900/50 text-blue-300'
                                                                : event.actionType === 'breed'
                                                                    ? 'bg-purple-900/50 text-purple-300'
                                                                    : 'bg-neutral-700 text-neutral-300'
                                                        }`}>
                                                        {event.actionType}
                                                    </span>
                                                    <span className="text-neutral-400 text-sm">
                                                        Gen {event.generation}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-neutral-400">
                                                    <span className="text-white">{event.userName || 'Anonymous'}</span>
                                                    {' が '}
                                                    <span className="text-emerald-400">1個を選択</span>
                                                    {event.rejectedGenomeIds.length > 0 && (
                                                        <>
                                                            {' / '}
                                                            <span className="text-red-400">
                                                                {event.rejectedGenomeIds.length}個を非選択
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-neutral-500 text-xs">
                                                {formatDate(event.timestamp)}
                                            </div>
                                        </div>

                                        {/* 選択詳細 */}
                                        <div className="mt-3 pt-3 border-t border-neutral-800 text-xs">
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-neutral-500">選択:</span>
                                                <code className="px-1 bg-emerald-900/30 text-emerald-400 rounded">
                                                    {event.selectedGenomeId.slice(0, 8)}...
                                                </code>
                                                {event.rejectedGenomeIds.length > 0 && (
                                                    <>
                                                        <span className="text-neutral-500 ml-2">非選択:</span>
                                                        {event.rejectedGenomeIds.slice(0, 3).map(id => (
                                                            <code
                                                                key={id}
                                                                className="px-1 bg-red-900/30 text-red-400 rounded"
                                                            >
                                                                {id.slice(0, 8)}...
                                                            </code>
                                                        ))}
                                                        {event.rejectedGenomeIds.length > 3 && (
                                                            <span className="text-neutral-500">
                                                                +{event.rejectedGenomeIds.length - 3}件
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
