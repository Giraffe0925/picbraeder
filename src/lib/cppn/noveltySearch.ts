/**
 * NoveltySearch — 新規性に基づく探索アルゴリズム
 *
 * 参考: Lehman & Stanley (2011)
 * "Abandoning Objectives: Evolution Through the Search for Novelty Alone"
 *
 * 行動空間でのスパースネス（k-NN平均距離）を新規性スコアとして使用。
 */

import {
    type BehaviorDescriptor,
    behaviorDistance,
    extractBehavior,
} from './behaviorExtractor';
import { type Genome } from './genome';

// ── 設定 ─────────────────────────────────────────────────

/** アーカイブ最大サイズ */
const MAX_ARCHIVE_SIZE = 500;

/** k近傍法の k 値 */
const DEFAULT_K = 15;

/** アーカイブ追加の閾値（スパースネスがこの値を超えたら追加） */
const DEFAULT_THRESHOLD = 0.3;

// ── アーカイブエントリ ────────────────────────────────────

interface ArchiveEntry {
    behavior: BehaviorDescriptor;
    genomeId: string;
    addedAt: number; // タイムスタンプ
}

// ── NoveltyArchive クラス ─────────────────────────────────

/**
 * Novelty Search で使用するアーカイブ
 * 過去の新規な行動を保存し、新規性スコアの計算に使用
 */
export class NoveltyArchive {
    private entries: ArchiveEntry[] = [];
    private k: number;
    private threshold: number;
    private maxSize: number;

    constructor(options?: { k?: number; threshold?: number; maxSize?: number }) {
        this.k = options?.k ?? DEFAULT_K;
        this.threshold = options?.threshold ?? DEFAULT_THRESHOLD;
        this.maxSize = options?.maxSize ?? MAX_ARCHIVE_SIZE;
    }

    /**
     * 行動記述子のスパースネス（新規性スコア）を計算
     *
     * @param behavior - 評価対象の行動記述子
     * @param population - 現在の集団の行動記述子（オプション）
     * @returns スパースネス値（0〜∞、高いほど新規）
     */
    calculateSparseness(
        behavior: BehaviorDescriptor,
        population: BehaviorDescriptor[] = [],
    ): number {
        // アーカイブと現在の集団を合わせた参照セット
        const allBehaviors = [
            ...this.entries.map(e => e.behavior),
            ...population,
        ];

        // 参照セットが空の場合、最大の新規性を返す
        if (allBehaviors.length === 0) {
            return Infinity;
        }

        // 距離を計算してソート
        const distances = allBehaviors
            .map(b => behaviorDistance(behavior, b))
            .sort((a, b) => a - b);

        // k または参照セットサイズの小さい方を使用
        const effectiveK = Math.min(this.k, distances.length);

        // k近傍の平均距離を返す
        let sum = 0;
        for (let i = 0; i < effectiveK; i++) {
            sum += distances[i];
        }

        return sum / effectiveK;
    }

    /**
     * 閾値を超えた場合、アーカイブに追加
     *
     * @param behavior - 行動記述子
     * @param genomeId - ゲノムID
     * @param population - 現在の集団（スパースネス計算用）
     * @returns 追加されたかどうか
     */
    maybeAdd(
        behavior: BehaviorDescriptor,
        genomeId: string,
        population: BehaviorDescriptor[] = [],
    ): { added: boolean; sparseness: number } {
        const sparseness = this.calculateSparseness(behavior, population);

        if (sparseness > this.threshold) {
            this.entries.push({
                behavior,
                genomeId,
                addedAt: Date.now(),
            });

            // サイズ制限: 古いエントリを削除
            if (this.entries.length > this.maxSize) {
                this.entries.shift();
            }

            return { added: true, sparseness };
        }

        return { added: false, sparseness };
    }

    /**
     * アーカイブの現在のサイズを取得
     */
    get size(): number {
        return this.entries.length;
    }

    /**
     * アーカイブをクリア
     */
    clear(): void {
        this.entries = [];
    }

    /**
     * アーカイブの全エントリを取得（デバッグ用）
     */
    getEntries(): readonly ArchiveEntry[] {
        return this.entries;
    }
}

// ── グローバルアーカイブインスタンス ─────────────────────

let globalArchive: NoveltyArchive | null = null;

/**
 * グローバルアーカイブを取得または作成
 */
export function getNoveltyArchive(): NoveltyArchive {
    if (!globalArchive) {
        globalArchive = new NoveltyArchive();
    }
    return globalArchive;
}

/**
 * グローバルアーカイブをリセット
 */
export function resetNoveltyArchive(): void {
    globalArchive = null;
}

// ── Novelty Search ヘルパー関数 ──────────────────────────

/**
 * 集団の各個体に新規性スコアを計算・設定
 *
 * @param population - ゲノム集団
 * @param archive - 使用するアーカイブ（省略時はグローバル）
 * @returns 新規性スコア付きのゲノム配列
 */
export function evaluateNovelty(
    population: Genome[],
    archive: NoveltyArchive = getNoveltyArchive(),
): Genome[] {
    // 全個体の行動記述子を抽出
    const behaviors: BehaviorDescriptor[] = population.map(g =>
        g.behaviorDescriptor ?? extractBehavior(g),
    );

    // 各個体の新規性を計算
    return population.map((g, i) => {
        const behavior = behaviors[i];
        const sparseness = archive.calculateSparseness(behavior, behaviors);

        // アーカイブへの追加を試みる
        archive.maybeAdd(behavior, g.id, behaviors);

        return {
            ...g,
            novelty: sparseness,
            behaviorDescriptor: behavior,
        };
    });
}

/**
 * 新規性に基づいて個体を選択
 *
 * @param population - 評価済み集団
 * @param count - 選択する個体数
 * @returns 選択された個体
 */
export function selectByNovelty(population: Genome[], count: number): Genome[] {
    // 新規性でソート（高い順）
    const sorted = [...population].sort(
        (a, b) => (b.novelty ?? 0) - (a.novelty ?? 0),
    );

    return sorted.slice(0, count);
}

/**
 * 自動探索: 与えられた親から新規性の高い個体を生成
 *
 * @param parent - 親ゲノム
 * @param candidateCount - 生成する候補数
 * @param mutate - 変異関数
 * @returns 最も新規性の高い個体
 */
export function exploreNovelty(
    parent: Genome,
    candidateCount: number,
    mutate: (g: Genome) => Genome,
): Genome {
    const archive = getNoveltyArchive();

    // 候補を生成
    const candidates: Genome[] = [];
    for (let i = 0; i < candidateCount; i++) {
        candidates.push(mutate(parent));
    }

    // 新規性を評価
    const evaluated = evaluateNovelty(candidates, archive);

    // 最も新規性の高い個体を返す
    return evaluated.reduce((best, current) =>
        (current.novelty ?? 0) > (best.novelty ?? 0) ? current : best,
    );
}
