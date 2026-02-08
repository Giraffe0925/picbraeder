/**
 * BehaviorExtractor — パターンから行動記述子を抽出する
 *
 * Novelty Search で使用する「行動」の特徴量を計算。
 * 参考: Lehman & Stanley (2011) "Abandoning Objectives"
 */

import { type Genome } from './genome';
import { evaluate, type CPPNOutput } from './network';

// ── 行動記述子の型定義 ───────────────────────────────────────

/**
 * パターンの「行動」を表す特徴ベクトル
 * Novelty Search での距離計算に使用
 */
export interface BehaviorDescriptor {
    /** 色相ヒストグラム（8ビン、0〜1に正規化） */
    hueHistogram: number[];
    /** 対称性スコア（0〜1） */
    symmetry: {
        horizontal: number;  // 左右対称性
        vertical: number;    // 上下対称性
        radial: number;      // 放射状対称性
    };
    /** 周波数帯域エネルギー（4バンド） */
    frequencyBands: number[];
    /** 中心からの放射状密度分布（4リング） */
    radialDensity: number[];
    /** 平均色（RGB） */
    averageColor: { r: number; g: number; b: number };
}

// ── ヘルパー関数 ───────────────────────────────────────────

/** RGB から色相（Hue）を計算（0〜1） */
function rgbToHue(r: number, g: number, b: number): number {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    if (delta === 0) return 0;

    let h: number;
    if (max === r) {
        h = ((g - b) / delta) % 6;
    } else if (max === g) {
        h = (b - r) / delta + 2;
    } else {
        h = (r - g) / delta + 4;
    }

    h = h / 6;
    if (h < 0) h += 1;
    return h;
}

/** 2つの色の差分を計算 */
function colorDiff(a: CPPNOutput, b: CPPNOutput): number {
    return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

// ── メイン抽出関数 ─────────────────────────────────────────

/**
 * ゲノムからパターンをサンプリングし、行動記述子を生成
 *
 * @param genome - CPPN ゲノム
 * @param resolution - サンプリング解像度（デフォルト: 16x16）
 * @returns 行動記述子
 */
export function extractBehavior(
    genome: Genome,
    resolution = 16,
): BehaviorDescriptor {
    const { nodes, connections } = genome;

    // パターンをサンプリング
    const samples: CPPNOutput[][] = [];
    for (let yi = 0; yi < resolution; yi++) {
        const row: CPPNOutput[] = [];
        for (let xi = 0; xi < resolution; xi++) {
            // 座標を [-1, 1] に正規化
            const x = (xi / (resolution - 1)) * 2 - 1;
            const y = (yi / (resolution - 1)) * 2 - 1;
            row.push(evaluate(nodes, connections, x, y, 0));
        }
        samples.push(row);
    }

    // ── 色相ヒストグラム（8ビン） ─────────────────────────

    const hueBins = 8;
    const hueHistogram = new Array(hueBins).fill(0);
    let totalPixels = 0;
    let sumR = 0, sumG = 0, sumB = 0;

    for (const row of samples) {
        for (const pixel of row) {
            const hue = rgbToHue(pixel.r, pixel.g, pixel.b);
            const bin = Math.min(hueBins - 1, Math.floor(hue * hueBins));
            hueHistogram[bin]++;
            totalPixels++;
            sumR += pixel.r;
            sumG += pixel.g;
            sumB += pixel.b;
        }
    }

    // ヒストグラムを正規化
    for (let i = 0; i < hueBins; i++) {
        hueHistogram[i] /= totalPixels;
    }

    // ── 対称性スコア ─────────────────────────────────────

    let horizontalDiff = 0;
    let verticalDiff = 0;
    let radialDiff = 0;
    let symmetryCount = 0;

    const mid = Math.floor(resolution / 2);
    const center = resolution / 2 - 0.5;

    for (let yi = 0; yi < resolution; yi++) {
        for (let xi = 0; xi < mid; xi++) {
            // 左右対称性
            const left = samples[yi][xi];
            const right = samples[yi][resolution - 1 - xi];
            horizontalDiff += colorDiff(left, right);

            // 上下対称性
            const top = samples[xi][yi];
            const bottom = samples[resolution - 1 - xi][yi];
            verticalDiff += colorDiff(top, bottom);

            symmetryCount++;
        }
    }

    // 放射状対称性（中心からの距離が同じピクセルを比較）
    for (let yi = 0; yi < mid; yi++) {
        for (let xi = 0; xi < mid; xi++) {
            const dy = yi - center;
            const dx = xi - center;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 4方向で比較
            const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
            const radiusPixels: CPPNOutput[] = [];

            for (const angle of angles) {
                const nxi = Math.round(center + dist * Math.cos(angle));
                const nyi = Math.round(center + dist * Math.sin(angle));
                if (nxi >= 0 && nxi < resolution && nyi >= 0 && nyi < resolution) {
                    radiusPixels.push(samples[nyi][nxi]);
                }
            }

            if (radiusPixels.length >= 2) {
                for (let i = 1; i < radiusPixels.length; i++) {
                    radialDiff += colorDiff(radiusPixels[0], radiusPixels[i]);
                }
            }
        }
    }

    const maxDiff = 3; // RGB各成分の最大差分
    const horizontal = 1 - horizontalDiff / (symmetryCount * maxDiff);
    const vertical = 1 - verticalDiff / (symmetryCount * maxDiff);
    const radial = Math.max(0, 1 - radialDiff / (mid * mid * 3 * maxDiff));

    // ── 周波数帯域（簡易版: 隣接ピクセル差分） ───────────

    const frequencyBands = [0, 0, 0, 0]; // low, mid-low, mid-high, high
    let freqCount = 0;

    for (let yi = 0; yi < resolution; yi++) {
        for (let xi = 0; xi < resolution - 1; xi++) {
            const diff = colorDiff(samples[yi][xi], samples[yi][xi + 1]);
            if (diff < 0.25) frequencyBands[0]++;
            else if (diff < 0.5) frequencyBands[1]++;
            else if (diff < 0.75) frequencyBands[2]++;
            else frequencyBands[3]++;
            freqCount++;
        }
    }

    for (let i = 0; i < 4; i++) {
        frequencyBands[i] /= freqCount;
    }

    // ── 放射状密度分布（4リング） ─────────────────────────

    const radialDensity = [0, 0, 0, 0];
    const radialCounts = [0, 0, 0, 0];
    const maxRadius = Math.sqrt(2); // 正規化座標での最大距離

    for (let yi = 0; yi < resolution; yi++) {
        for (let xi = 0; xi < resolution; xi++) {
            const x = (xi / (resolution - 1)) * 2 - 1;
            const y = (yi / (resolution - 1)) * 2 - 1;
            const dist = Math.sqrt(x * x + y * y);
            const ringIdx = Math.min(3, Math.floor((dist / maxRadius) * 4));

            const pixel = samples[yi][xi];
            const brightness = (pixel.r + pixel.g + pixel.b) / 3;
            radialDensity[ringIdx] += brightness;
            radialCounts[ringIdx]++;
        }
    }

    for (let i = 0; i < 4; i++) {
        radialDensity[i] = radialCounts[i] > 0 ? radialDensity[i] / radialCounts[i] : 0;
    }

    // ── 結果を返す ───────────────────────────────────────

    return {
        hueHistogram,
        symmetry: { horizontal, vertical, radial },
        frequencyBands,
        radialDensity,
        averageColor: {
            r: sumR / totalPixels,
            g: sumG / totalPixels,
            b: sumB / totalPixels,
        },
    };
}

/**
 * 行動記述子をフラットな数値配列に変換（距離計算用）
 */
export function behaviorToVector(b: BehaviorDescriptor): number[] {
    return [
        ...b.hueHistogram,                    // 8
        b.symmetry.horizontal,                // 1
        b.symmetry.vertical,                  // 1
        b.symmetry.radial,                    // 1
        ...b.frequencyBands,                  // 4
        ...b.radialDensity,                   // 4
        b.averageColor.r,                     // 1
        b.averageColor.g,                     // 1
        b.averageColor.b,                     // 1
    ];                                      // = 22 次元
}

/**
 * 2つの行動記述子間のユークリッド距離を計算
 */
export function behaviorDistance(a: BehaviorDescriptor, b: BehaviorDescriptor): number {
    const va = behaviorToVector(a);
    const vb = behaviorToVector(b);

    let sumSq = 0;
    for (let i = 0; i < va.length; i++) {
        const diff = va[i] - vb[i];
        sumSq += diff * diff;
    }

    return Math.sqrt(sumSq);
}
