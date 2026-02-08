/**
 * Genome URL 共有機能
 * Genome をBase64エンコードしてURLパラメータで共有
 */

import type { Genome } from './genome';

/**
 * Genome を圧縮してBase64エンコード
 * （nodes と connections のみ保存）
 */
export function encodeGenome(genome: Genome): string {
    const data = {
        n: genome.nodes,
        c: genome.connections,
    };
    return btoa(JSON.stringify(data));
}

/**
 * Base64 から Genome をデコード
 */
export function decodeGenome(encoded: string): Genome | null {
    try {
        const data = JSON.parse(atob(encoded));
        return {
            id: crypto.randomUUID(),
            fitness: 0,
            nodes: data.n,
            connections: data.c,
        };
    } catch (e) {
        console.error('Failed to decode genome:', e);
        return null;
    }
}

/**
 * 現在のURLにgenomeパラメータを追加した共有URLを生成
 */
export function createShareUrl(genome: Genome): string {
    const encoded = encodeGenome(genome);
    const url = new URL(window.location.href);
    url.searchParams.set('genome', encoded);
    return url.toString();
}
