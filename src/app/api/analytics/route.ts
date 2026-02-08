import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { type EvolutionEvent, type UserSummary, isAdmin } from '@/lib/analytics/evolutionTracker';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Analytics API
 * POST: 進化イベントを記録
 * GET: 管理者のみ履歴を取得
 */

// KV キー
const EVENTS_KEY = 'evolution_events';
const USERS_KEY = 'evolution_users';

/** POST: 進化イベントを記録 */
export async function POST(req: NextRequest) {
    try {
        const event: EvolutionEvent = await req.json();

        // KVに保存（リスト形式）
        try {
            // イベントを追加
            await kv.lpush(EVENTS_KEY, JSON.stringify(event));

            // 最大10000件まで保存
            await kv.ltrim(EVENTS_KEY, 0, 9999);

            // ユーザーサマリーを更新
            const userKey = `user:${event.userId}`;
            const existingUser = await kv.get<UserSummary>(userKey);

            const userSummary: UserSummary = {
                userId: event.userId,
                userEmail: event.userEmail || existingUser?.userEmail,
                userName: event.userName || existingUser?.userName,
                firstSeen: existingUser?.firstSeen || event.timestamp,
                lastSeen: event.timestamp,
                totalEvents: (existingUser?.totalEvents || 0) + 1,
                totalGenerations: Math.max(existingUser?.totalGenerations || 0, event.generation),
            };

            await kv.set(userKey, userSummary);

            // ユーザーIDリストに追加
            await kv.sadd(USERS_KEY, event.userId);
        } catch (kvError) {
            // KVがない場合は無視（ローカル開発時）
            console.log('KV not available, skipping server storage');
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Analytics POST error:', error);
        return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
    }
}

/** GET: 管理者のみ履歴を取得 */
export async function GET(req: NextRequest) {
    try {
        // セッション確認
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !isAdmin(session.user.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'summary';

        try {
            if (type === 'users') {
                // ユーザー一覧を取得
                const userIds = await kv.smembers(USERS_KEY);
                const users: UserSummary[] = [];

                for (const userId of userIds) {
                    const user = await kv.get<UserSummary>(`user:${userId}`);
                    if (user) users.push(user);
                }

                // 最終アクティブ順でソート
                users.sort((a, b) => b.lastSeen - a.lastSeen);

                return NextResponse.json({ users });
            }

            if (type === 'events') {
                // イベント一覧を取得（最新100件）
                const limit = parseInt(searchParams.get('limit') || '100');
                const events = await kv.lrange(EVENTS_KEY, 0, limit - 1);

                return NextResponse.json({
                    events: events.map(e => typeof e === 'string' ? JSON.parse(e) : e)
                });
            }

            if (type === 'user-events') {
                // 特定ユーザーのイベントを取得
                const userId = searchParams.get('userId');
                if (!userId) {
                    return NextResponse.json({ error: 'userId required' }, { status: 400 });
                }

                const allEvents = await kv.lrange(EVENTS_KEY, 0, 9999);
                const userEvents = allEvents
                    .map(e => typeof e === 'string' ? JSON.parse(e) : e)
                    .filter((e: EvolutionEvent) => e.userId === userId);

                return NextResponse.json({ events: userEvents });
            }

            // デフォルト: サマリー
            const userIds = await kv.smembers(USERS_KEY);
            const totalEvents = await kv.llen(EVENTS_KEY);

            return NextResponse.json({
                totalUsers: userIds.length,
                totalEvents,
            });
        } catch (kvError) {
            // KVがない場合
            return NextResponse.json({
                totalUsers: 0,
                totalEvents: 0,
                message: 'KV not configured',
            });
        }
    } catch (error) {
        console.error('Analytics GET error:', error);
        return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 });
    }
}
