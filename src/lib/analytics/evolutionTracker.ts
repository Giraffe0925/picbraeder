/**
 * evolutionTracker.ts — 進化履歴の記録と分析
 * 管理者がユーザーの選択履歴を分析するためのモジュール
 */

/** 進化イベントの型 */
export interface EvolutionEvent {
    userId: string;           // Google ID またはセッションID
    userEmail?: string;       // メールアドレス（管理者表示用）
    userName?: string;        // ユーザー名
    timestamp: number;        // タイムスタンプ
    generation: number;       // 世代番号
    selectedGenomeId: string; // 選択したパターンのID
    rejectedGenomeIds: string[]; // 選択しなかったパターンのID
    parentGenomeId?: string;  // 親パターンのID（あれば）
    actionType: 'select' | 'auto-explore' | 'breed' | 'reset';
}

/** ユーザーサマリーの型 */
export interface UserSummary {
    userId: string;
    userEmail?: string;
    userName?: string;
    firstSeen: number;
    lastSeen: number;
    totalEvents: number;
    totalGenerations: number;
}

/** 管理者メールアドレス */
export const ADMIN_EMAILS = ['satimakoto@gmail.com'];

/** 管理者かどうか判定 */
export function isAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

/** ローカルストレージキー */
const EVOLUTION_HISTORY_KEY = 'picbraeder_evolution_history';

/** ローカルに進化イベントを保存 */
export function saveEventLocally(event: EvolutionEvent): void {
    if (typeof window === 'undefined') return;

    try {
        const raw = localStorage.getItem(EVOLUTION_HISTORY_KEY);
        const history: EvolutionEvent[] = raw ? JSON.parse(raw) : [];
        history.push(event);

        // 最大1000件まで保存（古いものを削除）
        if (history.length > 1000) {
            history.splice(0, history.length - 1000);
        }

        localStorage.setItem(EVOLUTION_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('Failed to save evolution event:', e);
    }
}

/** ローカルから進化履歴を取得 */
export function getLocalHistory(): EvolutionEvent[] {
    if (typeof window === 'undefined') return [];

    try {
        const raw = localStorage.getItem(EVOLUTION_HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed to load evolution history:', e);
        return [];
    }
}

/** サーバーに進化イベントを送信 */
export async function sendEventToServer(event: EvolutionEvent): Promise<void> {
    try {
        await fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
        });
    } catch (e) {
        console.error('Failed to send event to server:', e);
    }
}

/** 進化イベントを記録（ローカル + サーバー） */
export function trackEvolutionEvent(event: EvolutionEvent): void {
    // ローカルに保存
    saveEventLocally(event);

    // サーバーに送信（非同期、エラーは無視）
    sendEventToServer(event);
}
