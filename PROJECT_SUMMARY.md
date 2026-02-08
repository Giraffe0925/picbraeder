# Project Summary: "The Accidental Keychain" (Picbraeder)

## 概要

「目標という幻想」の思想に基づき、ユーザーが好みのデザインを選択し続けることで、予期せぬ美しいパターンを進化させるブラウザベースアプリケーション。最終的に選んだデザインを3Dキーホルダーとして注文できる。

**コンセプト**: Picbreeder（2Dパターン進化）+ 3Dプリント注文

---

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 16.1.6 (App Router) |
| 言語 | TypeScript 5 |
| UI | React 19 + Tailwind CSS 4 |
| 3D | Three.js 0.182 + @react-three/fiber 9 + @react-three/drei 10 |
| 状態管理 | カスタムReact Hook（外部ライブラリなし） |
| サーバー | なし（完全クライアントサイド） |

---

## アーキテクチャ

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # ルートレイアウト（タイトル: "The Accidental Keychain"）
│   └── page.tsx            # メインページ（BreederGridを配置）
│
├── components/             # UIコンポーネント
│   ├── BackgroundMosaic.tsx  # 背景: シミュレートされたユーザー作品を色順で敷き詰め
│   ├── BreederGrid.tsx       # メインUI: ギャラリー + 3×3進化グリッド + 背景
│   ├── Gallery.tsx           # 左サイドバー: コミュニティデザイン（プリセット）
│   ├── PicCanvas.tsx         # 2Dパターンレンダラー（Canvas API）
│   ├── InspectorModal.tsx    # 「購入する」押下で開く3Dプレビューモーダル
│   ├── ThreeViewer.tsx       # OrbitControls付き3Dビューワー
│   ├── ExportPanel.tsx       # STLダウンロード + コスト見積もり
│   └── ThreeCanvas.tsx       # (旧) 3Dプレビュー用、現在未使用
│
├── lib/                    # ロジック層
│   ├── cppn/
│   │   ├── activation.ts   # 活性化関数6種（sigmoid, sin, cos, gaussian, linear, abs）
│   │   ├── network.ts      # CPPNフィードフォワード評価（トポロジカルソート）
│   │   ├── genome.ts       # ゲノム構造、変異、交叉、集団生成
│   │   ├── presets.ts      # 手作りプリセットゲノム6種（コミュニティデザイン）
│   │   └── simulate.ts    # 100人×50世代の進化シミュレーション（背景用）
│   └── mesher/
│       ├── voxelizer.ts    # CPPN→3Dボクセルグリッド変換
│       └── marchingCubes.ts # マーチングキューブ法（ボクセル→メッシュ）
│
└── store/
    └── evolutionStore.ts   # React Hook: generation, population, select, selectParent, reset
```

---

## コアアルゴリズム: CPPN-NEAT

### CPPN (Compositional Pattern Producing Network)

各ピクセル座標 (x, y) を入力し、色 (R, G, B) を出力するニューラルネットワーク。

**入力ノード (5個)**:
- `x`, `y`: 正規化座標 [-1, 1]
- `z`: Z座標（2Dモードでは常に0）
- `d`: 中心からの距離 √(x²+y²+z²)
- `bias`: 定数 1.0

**出力ノード (4個)**:
- `density`: 密度値（3Dメッシュ生成用）
- `R`, `G`, `B`: 色情報 [0, 1]（2Dパターン用、sigmoid活性化）

**隠れノード (シードゲノムに4個)**:
- id=9: gaussian(d) → 放射状パターン
- id=10: sin(x) → 波紋パターン
- id=11: cos(z) → 格子パターン
- id=12: abs(y) → 左右対称性

### NEAT (NeuroEvolution of Augmenting Topologies)

進化的にネットワーク構造を拡張する手法。

**変異操作**:
| 操作 | 確率 | 説明 |
|------|------|------|
| Add Node | 3% | 既存接続を分割し、隠れノード挿入 |
| Add Connection | 5% | 未接続ノード間に新接続追加 |
| Weight Mutation | 80% | 重みの摂動（90%）または再割り当て（10%） |
| Activation Mutation | 5% | 隠れノードの活性化関数を変更 |
| Toggle Connection | 2% | 接続のON/OFF切り替え |

**交叉**: innovationId（歴史マーカー）に基づくNEAT式。マッチング遺伝子はランダム継承、過剰/不足遺伝子は高fitness親から継承。

---

## ユーザーフロー

### メイン画面

```
┌─────────────────────────────────────────────────────┐
│  背景: 色順に並んだ過去ユーザーの作品（クリック可能）     │
│  ┌──────────┬──────────────────────────────┐         │
│  │ Gallery  │     3×3 Evolution Grid       │         │
│  │ (preset  │  ┌──┐ ┌──┐ ┌──┐             │         │
│  │ designs) │  │  │ │  │ │  │             │         │
│  │          │  │購入│ │購入│ │購入│             │         │
│  │ Click to │  └──┘ └──┘ └──┘             │         │
│  │ use as   │  ┌──┐ ┌──┐ ┌──┐             │         │
│  │ parent   │  │  │ │  │ │  │             │         │
│  │          │  └──┘ └──┘ └──┘             │         │
│  │ 6 presets│  ┌──┐ ┌──┐ ┌──┐             │         │
│  │ (Nebula, │  │  │ │  │ │  │             │         │
│  │  Waves,  │  └──┘ └──┘ └──┘             │         │
│  │  etc.)   │  Generation N [Reset]        │         │
│  └──────────┴──────────────────────────────┘         │
└─────────────────────────────────────────────────────┘
```

### 操作

1. **グリッドのデザインをクリック** → そのデザインを親として次世代9個体を生成（進化）
2. **「購入する」ボタン** → InspectorModal が開く（3Dプレビュー + STLダウンロード + コスト見積もり）
3. **ギャラリーのプリセットをクリック** → そのプリセットを親として進化開始
4. **背景タイルをクリック** → そのシミュレーション作品を親として進化開始
5. **Reset** → 初期ランダム集団に戻る

---

## 3Dパイプライン（購入フロー）

「購入する」ボタン押下時に実行される処理:

```
Genome → voxelize(40³) → morphOpen → keepLargestComponent → marchingCubes → BufferGeometry
                                                                                ↓
                                                                        ThreeViewer (OrbitControls)
                                                                                ↓
                                                                        ExportPanel (STL + Cost)
```

- **Voxelization**: CPPNを40³グリッドで評価し密度値を取得
- **Morphological Opening**: 収縮→膨張でノイズ除去
- **keepLargestComponent**: 最大連結成分のみ保持（浮遊パーツ除去）
- **Marching Cubes**: iso-level 0.3で等値面メッシュ生成
- **STL Export**: バイナリSTL形式、50mm³バウンディングボックスにスケーリング
- **コスト見積もり**: 体積 × 100円/cm³ + 基本料500円

---

## 背景モザイク

`simulate.ts` で100人のユーザーが各50世代進化させた結果をシミュレーション。

**シミュレーション方法**:
1. シードゲノムを生成し、5回変異で初期多様性を確保
2. 50世代ループ: 4候補（親+3変異体）からランダムに1つ選択（ユーザーの選好をシミュレート）
3. 最終ゲノムの平均色相（Hue）を計算
4. 全100個を色相順にソート

**レンダリング**: 32×32pxタイルとして画面全体に敷き詰め。opacity 25%で背景として表示。各タイルはクリック可能で、親として選択できる。

---

## プリセットゲノム（コミュニティデザイン）

`presets.ts` に6種の手作りゲノムを定義:

| 名前 | 特徴 |
|------|------|
| Nebula | 放射状のぼかし + 波紋 |
| Waves | sin/cos による波パターン |
| Mandala | 円形対称パターン |
| Crystal | 格子状の結晶パターン |
| Flame | 暖色系の炎パターン |
| Cells | 細胞状のパターン |

---

## 状態管理 (evolutionStore)

```typescript
interface EvolutionState {
  generation: number;      // 現在の世代番号
  population: Genome[];    // 現在の9個体
}

// アクション:
select(id: string)         // グリッド個体をクリック → その個体を親に次世代生成
selectParent(genome: Genome) // 外部ゲノム（ギャラリー/背景）を親に次世代生成
reset()                    // 初期ランダム集団にリセット
```

**次世代生成ロジック** (`breedNextGeneration`):
- 1個体はエリートクローン（最良親のコピー）
- 残りは変異（60%）または交叉+変異（40%）で生成

---

## 重要な技術的判断と修正履歴

1. **3D→2D ピボット**: 当初は3D形状を進化させていたが、分離パーツ問題が解決困難だったため、2Dパターン進化（Picbreeder方式）に変更
2. **トポロジカルソートのバグ修正**: 入力ノードの出力エッジがin-degreeに加算されるが、入力ノードは処理キューに入らないため出力ノードが永遠に処理されなかった → 入力ノードのエッジをin-degree計算からスキップ
3. **密度出力の活性化関数**: sigmoid（常に正）→ gaussian（常に正）→ linear に変更。iso-level調整と合わせて適切な3D形状生成を実現

---

## 今後の拡張可能性

- サーバーサイド: ユーザー作品の保存・共有（現在は全クライアントサイド）
- 2D→3D変換の改善: 現在の密度ベースvoxelization以外のアプローチ
- PNG/SVGエクスポート: 2Dデザインの画像出力
- 実際の3Dプリント注文API連携
- ユーザー認証とギャラリーへの投稿機能
