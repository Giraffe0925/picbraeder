# Picbreeder・Novelty Search 研究調査レポート & 実装指示書

## 目次

1. [研究背景](#研究背景)
2. [調査した論文](#調査した論文)
3. [核心アルゴリズム](#核心アルゴリズム)
4. [実装指示](#実装指示)
5. [検証方法](#検証方法)

---

## 研究背景

「目標という幻想」の思想に基づき、**目標を設定せずに探索する**ことで予期せぬ発見を促すアプローチ。

---

## 調査した論文

### 1. Picbreeder (2008) — Kenneth Stanley

**核心**: ユーザーの主観的選好を「フィットネス関数」として使用

- **Interactive Evolutionary Computation (IEC)**: 人間が選択を繰り返すことで進化を導く
- **ブランチング機能**: 他ユーザーの作品から派生して進化を継続
- **ユーザー疲労対策**: 複数ユーザーで世代を分担

### 2. CPPN-NEAT — 変異・交叉アルゴリズム

| 操作 | 確率 | 説明 |
|------|------|------|
| Add Node | 3% | 既存接続を分割し隠れノード挿入 |
| Add Connection | 5% | 未接続ノード間に新接続追加 |
| Weight Mutation | 80% | 重みの摂動（90%）or 再割り当て（10%） |
| Activation Mutation | 5% | 隠れノードの活性化関数を変更 |
| Toggle Connection | 2% | 接続のON/OFF切り替え |

→ **現在の genome.ts は論文通りに実装済み**

### 3. Novelty Search (2011) — Joel Lehman & Kenneth Stanley

**核心**: 目標ベース探索の代わりに「新規性」を報酬にする

**問題**: 目標ベース探索は「欺瞞的な目標」で局所最適に陥る

**解決策**: 行動空間での「新しさ」を報酬にする

---

## 核心アルゴリズム

### 行動記述子 (Behavioral Descriptor)

個体の「行動」を低次元ベクトルで表現:

```
BehaviorDescriptor = {
  hueHistogram[8],      // 色相ヒストグラム
  symmetry { h, v, r }, // 対称性スコア
  frequencyBands[4],    // 周波数帯域
  radialDensity[4],     // 放射状密度
  averageColor { r,g,b } // 平均色
}
// → 22次元ベクトル
```

### スパースネス計算（k-NN法）

```
sparseness(x) = (1/k) × Σ distance(x, k-nearest-neighbors)
```

- **k = 15** が推奨
- 距離: ユークリッド距離
- 高スパースネス = 高新規性

### アーカイブ管理

```
if sparseness > threshold:
    archive.add(behavior)
    if archive.size > MAX_SIZE:
        archive.remove_oldest()
```

- **閾値**: 0.3（調整可能）
- **最大サイズ**: 500

---

## 実装指示

### Phase 1: Novelty Search

#### 新規ファイル

**1. `src/lib/cppn/behaviorExtractor.ts`**

```typescript
export interface BehaviorDescriptor { ... }
export function extractBehavior(genome: Genome, resolution = 16): BehaviorDescriptor;
export function behaviorDistance(a: BehaviorDescriptor, b: BehaviorDescriptor): number;
```

**2. `src/lib/cppn/noveltySearch.ts`**

```typescript
export class NoveltyArchive {
  calculateSparseness(behavior, population?): number;
  maybeAdd(behavior, genomeId, population?): { added, sparseness };
}
export function evaluateNovelty(population: Genome[]): Genome[];
export function exploreNovelty(parent: Genome, candidateCount: number, mutate): Genome;
```

#### 修正ファイル

**3. `src/lib/cppn/genome.ts`**

```diff
+ novelty?: number;
+ behaviorDescriptor?: BehaviorDescriptor;
```

**4. `src/store/evolutionStore.ts`**

- `autoExplore()` 関数追加
- `archiveSize` ステート追加

**5. `src/components/BreederGrid.tsx`**

- 「🔍 自動探索」ボタン追加
- Novelty スコア表示（N: 0.00）

---

### Phase 2: ブランチング機能（オプション）

- 作品を LocalStorage に保存
- ギャラリーに「ここから派生」ボタン追加

### Phase 3: 複数親選択（オプション）

- Shift+クリックで複数選択
- 交叉確率を上げる

---

## 検証方法

```bash
# ビルド確認
npx tsc --noEmit

# 開発サーバー
npm run dev
```

**ブラウザ確認:**

1. 「自動探索」を数回クリック
2. パターンの多様性が増すこと
3. Archive 数が増加すること
4. N: スコアが表示されること

---

## 備考

Antigravityが既にPhase 1の一部を実装済み。詳細は以下のファイルを確認:

- `src/lib/cppn/behaviorExtractor.ts`
- `src/lib/cppn/noveltySearch.ts`
- `src/store/evolutionStore.ts`（autoExplore追加）
- `src/components/BreederGrid.tsx`（UIボタン追加）
