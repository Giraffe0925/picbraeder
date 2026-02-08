# SUZURI連携 & 購入フロー 実装指示書（Claude Code向け）

## 概要

このドキュメントは、Claude Codeが実装するための詳細な手順書です。

---

## Phase 0: 世代バグ修正（最優先）

### 問題

世代カウンターが進まない。

### 調査・修正手順

1. `src/store/evolutionStore.ts` の `select` 関数を確認
2. `setState` が正しく `generation + 1` を返しているか確認
3. `evaluateNovelty` で例外が発生していないか確認（try-catch済みだが確認）
4. ブラウザのコンソールでエラーがないか確認

### 確認方法

```bash
npm run dev
# ブラウザでパターンをクリック → Generation が 0 → 1 → 2 と増加すること
```

---

## Phase 1: SUZURI API 連携

### 1.1 新規ファイル作成

#### `src/lib/suzuri/config.ts`

```typescript
export const SUZURI_CONFIG = {
  apiBase: 'https://suzuri.jp/api/v1',
  itemIds: {
    acrylic_keychain: 182,
    sticker: 3,
  },
};
```

#### `src/app/api/suzuri/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const SUZURI_API_KEY = process.env.SUZURI_API_KEY;

export async function POST(req: NextRequest) {
  const { imageBase64, title } = await req.json();

  if (!SUZURI_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const res = await fetch('https://suzuri.jp/api/v1/materials', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUZURI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      texture: imageBase64,  // Data URI形式
      title: title || '偶然のキーホルダー',
      description: 'Picbraederで生成されたパターン',
      price: 0,  // 上乗せ価格
      products: [
        { itemId: 182, published: true },  // アクリルキーホルダー
      ],
    }),
  });

  const data = await res.json();
  
  // 商品ページURLを返す
  const productUrl = data.products?.[0]?.sampleUrl;
  return NextResponse.json({ productUrl, data });
}
```

### 1.2 BreederGrid.tsx 修正

```typescript
// 追加するimport
import { useState } from 'react';
import InspectorModal from './InspectorModal';

// コンポーネント内
const [inspecting, setInspecting] = useState<Genome | null>(null);

// 「購入する」ボタンの onClick を修正
onClick={(e) => {
  e.stopPropagation();
  setInspecting(genome);
}}

// JSXの最後に追加
{inspecting && (
  <InspectorModal genome={inspecting} onClose={() => setInspecting(null)} />
)}
```

### 1.3 SuzuriOrderPanel.tsx 新規作成

```typescript
'use client';

import { useState } from 'react';
import type { Genome } from '@/lib/cppn/genome';

interface Props {
  genome: Genome;
  canvasDataUrl: string;  // Base64画像
}

export default function SuzuriOrderPanel({ genome, canvasDataUrl }: Props) {
  const [loading, setLoading] = useState(false);
  const [productUrl, setProductUrl] = useState<string | null>(null);

  const handleOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/suzuri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: canvasDataUrl,
          title: `Picbraeder #${genome.id.slice(0, 8)}`,
        }),
      });
      const data = await res.json();
      setProductUrl(data.productUrl);
    } catch (e) {
      console.error('SUZURI API error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (productUrl) {
    return (
      <div className="flex flex-col gap-2">
        <a
          href={productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-orange-600 text-white px-4 py-2 text-center hover:bg-orange-500"
        >
          SUZURIで注文する
        </a>
      </div>
    );
  }

  return (
    <button
      onClick={handleOrder}
      disabled={loading}
      className="bg-orange-600 text-white px-4 py-2 hover:bg-orange-500 disabled:opacity-50"
    >
      {loading ? '準備中...' : 'キーホルダーを注文'}
    </button>
  );
}
```

### 1.4 InspectorModal.tsx 修正

```typescript
// SuzuriOrderPanel を追加
import SuzuriOrderPanel from './SuzuriOrderPanel';

// Side panel に追加
<SuzuriOrderPanel genome={genome} canvasDataUrl={/* canvas から取得 */} />
```

---

## Phase 2: URL共有機能

### 2.1 Genome をBase64エンコード

```typescript
// src/lib/cppn/share.ts
export function encodeGenome(genome: Genome): string {
  return btoa(JSON.stringify({
    nodes: genome.nodes,
    connections: genome.connections,
  }));
}

export function decodeGenome(encoded: string): Genome {
  const { nodes, connections } = JSON.parse(atob(encoded));
  return { id: crypto.randomUUID(), fitness: 0, nodes, connections };
}
```

### 2.2 URLパラメータから読み込み

```typescript
// src/app/page.tsx
'use client';
import { useSearchParams } from 'next/navigation';
import { decodeGenome } from '@/lib/cppn/share';

// 初期化時にURLパラメータをチェック
const params = useSearchParams();
const sharedGenome = params.get('genome');
if (sharedGenome) {
  const genome = decodeGenome(sharedGenome);
  // このgenomeを親として進化を開始
}
```

---

## 環境変数

`.env.local` を作成:

```
SUZURI_API_KEY=your_api_key_here
```

---

## 検証チェックリスト

- [ ] 世代カウンターがクリックで増加する
- [ ] 「購入する」クリックで InspectorModal が開く
- [ ] 3Dプレビューが表示される
- [ ] 「キーホルダーを注文」で SUZURI APIが呼ばれる（APIキー設定後）
- [ ] URL共有でパターンが復元される
