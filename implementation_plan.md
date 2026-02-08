# 技術設計書 (Technical Design Doc): "The Accidental Keychain"

本ドキュメントは、シニア・ソフトウェアアーキテクトとして、実装担当のAI (Claude Code) が最短経路かつミスなく「The Accidental Keychain」のMVPを構築するための詳細な設計書である。**作成者**: Antigravity (Architect)
**更新**: 2026/02/06
**ステータス**: Phase 2完了 / Phase 3進行中

## 0. プロジェクト概要

「目標という幻想」の思想に基づき、ユーザーが好みの形状を選択し続けることで、予期せぬ美しい3Dキーホルダーを進化させるブラウザベースのアプリケーション。

**現在の進捗:**

- Core Algorithm (CPPN): 実装完了 ✅
- 2D Preview (Breeder): 実装完了 ✅
- 3D Mesher Logic: 実装完了 ✅ (Voxelizer, Marching Cubes)

**次の目標:**

- ユーザーが選んだデザインを3Dモデルとしてプレビューする機能 (Inspector)。
- 3Dプリント用ファイル (STL) のエクスポート機能。

## 1. Mathematical Algorithm (CPPN-NEAT)

3D形状を生成するための Compositional Pattern Producing Networks (CPPN) の定義。

### 1.1 数理モデル

各ボクセル座標 $(x, y, z)$ において、ネットワークは以下の関数 $f$ として定義される。

$$
(Density, R, G, B) = f(x, y, z, d, bias)
$$

- **入力 (Input Layer)**:
  - $x, y, z$: 正規化された座標 $[-1.0, 1.0]$
  - $d$: 中心からの距離 $\sqrt{x^2 + y^2 + z^2}$
  - $bias$: 定数 $1.0$
- **出力 (Output Layer)**:
  - $Density$: 密度値 (閾値 $T$ 以上で固体とみなす)。範囲 $[-1.0, 1.0]$
  - $R, G, B$: 色情報 (オプション、今回は単色出力なら省略可だが将来性のために定義)。範囲 $[0.0, 1.0]$
- **活性化関数 (Activation Functions)**:
  - 以下の関数プールからランダムまたは遺伝的変異により選択される。
  - `Sine`, `Cosine`, `Gaussian`, `Sigmoid`, `Linear`, `Abs` (対称性生成用)

### 1.2 ネットワーク評価

- 座標を受け取り、フィードフォワード計算を行う。
- 循環結合（Recurrent）は禁止（DAG構造）。

## 2. 3D Pipeline Architecture (Browser-based)

サーバーレスで、ブラウザ上の計算リソースのみで完結するパイプライン。

### 2.1 アーキテクチャ図 (Mermaid)

```mermaid
graph TD
    subgraph Data [Data Layer]
        Genome[Genome JSON] -->|Decode| Network[CPPN Network]
    end

    subgraph Compute [Computation Layer]
        Network -->|Query (x,y,z)| VoxelGrid[Voxel Grid 50x50x50]
        VoxelGrid -->|Morphology Filter| CleanVoxel[Cleaned Voxels]
        CleanVoxel -->|Marching Cubes| Geometry[BufferGeometry]
    end

    subgraph Render [Presentation Layer]
        Geometry -->|Three.js| Canvas[Interactive Preview]
        Canvas -->|User Input| Selection[Selection Logic]
    end

    subgraph Export [Export Layer]
        Geometry -->|STLExporter| STLFile[.stl]
        STLFile -->|Volume Calc| CostEst[Cost Estimator]
    end

    Selection -->|Mutation/Crossover| Genome
```

### 2.2 パイプライン詳細

1. **Voxelization**:
    - 解像度: $50 \times 50 \times 50$ (プレビュー用)。入稿用は $100 \times 100 \times 100$ 推奨。
    - バウンディングボックス: $50mm \times 50mm \times 50mm$。
2. **Marching Cubes**:
    - `Three.js` の追加モジュールまたは軽量な `marching-cubes-js` を使用。
    - 等値面閾値 (Threshold): $0.5$ (密度出力が $0.1$ 程度を境界とするなど調整)。
3. **3Dプリント適正化 (Manifold & Thickness)**:
    - **幾何学的保証**: Marching Cubes自体は閉じた多様体を生成するが、ノイズによる浮遊ゴミが発生しやすい。
    - **対策**: ボクセルグリッド上で「モルフォロジー演算 (Opening = 収縮後に膨張)」を適用し、1ボクセル以下の微小パーツを除去してからメッシュ化する。
    - **肉厚**: 最小肉厚1.5mmを保証するため、ボクセル解像度1単位が約1mmの場合、孤立した1ボクセルは消滅させるロジックで担保する。

## 3. Data Schema & State Management

### 3.1 Genome JSON構造

Claude CodeがDB設計や型定義で迷わないためのSchema定義。

```typescript
// 型定義 (TypeScript)
type ActivationType = 'sigmoid' | 'sin' | 'cos' | 'gaussian' | 'linear' | 'abs';

interface NodeGene {
  id: number;
  type: 'input' | 'hidden' | 'output';
  activation: ActivationType;
  bias: number;
}

interface ConnectionGene {
  inNodeId: number;
  outNodeId: number;
  weight: number;
  enabled: boolean;
  innovationId: number; // 交叉のための歴史マーカー
}

interface Genome {
  id: string;
  nodes: NodeGene[];
  connections: ConnectionGene[];
  fitness: number; // ユーザー選択時は1、非選択は0
}
```

### 3.2 進化ロジック (Mutation & Crossover)

```typescript
// コア進化ロジックの擬似コード

function mutate(genome: Genome): Genome {
  const newGenome = clone(genome);
  
  if (random() < PROB_ADD_NODE) {
    // 既存の接続を分割してノード挿入
    const conn = selectRandomEnabledConnection(newGenome);
    conn.enabled = false;
    
    const newNode = createNode('hidden', randomActivation());
    const inConn = createConnection(conn.inNodeId, newNode.id, 1.0);
    const outConn = createConnection(newNode.id, conn.outNodeId, conn.weight);
    
    newGenome.nodes.push(newNode);
    newGenome.connections.push(inConn, outConn);
  }
  
  if (random() < PROB_ADD_CONN) {
    // 接続されていない2ノード間に接続追加
    const [node1, node2] = selectUnconnectedNodes(newGenome);
    const newConn = createConnection(node1.id, node2.id, randomWeight());
    newGenome.connections.push(newConn);
  }

  if (random() < PROB_MUTATE_WEIGHT) {
    // 重みの摂動
    newGenome.connections.forEach(c => {
      if (random() < PROB_PERTURB) {
        c.weight += randomGaussian() * STEP_SIZE;
      } else {
        c.weight = randomNewWeight();
      }
    });
  }
  
  return newGenome;
}
```

- **突然変異 (Mutation)**:
  1. **Link Mutation**: 既存のノード間に新しい接続を追加。
  2. **Node Mutation**: 接続を分割し、間に新しいノードを挿入。
  3. **Weight Mutation**: 既存の重みをランダムに摂動、または再割り当て。
  4. **Activation Mutation**: ノードの活性化関数を変更。
- **交叉 (Crossover)**:
  - 同じ `innovationId` を持つ遺伝子（Matching Genes）はランダムに継承。
  - 過剰遺伝子（Excess）と素性遺伝子（Disjoint）は、フィットネスが高い親（選択された親）から継承。

## 4. Production & Cost Guardrails

### 4.1 サイズ制限

- **Bounding Box**: $50mm \times 50mm \times 50mm$。
- 出力時のスケーリング係数: メッシュ座標 $[-1, 1]$ を物理サイズ $[0mm, 50mm]$ にマッピング。

### 4.2 コスト予測ロジック

- **体積計算**:
  - メッシュ化されたモデルの体積 $V_{mesh}$ を計算（符号付き四面体積算など）。
  - または簡易的に、Thresholdを超えたボクセル数 $\times$ 1ボクセルの体積。
- **コスト式**:
  $$ \text{Cost} = (V_{mesh} \times \text{MaterialUnitPrice}) + \text{BaseFee} $$
  - 例: ナイロン素材なら $\approx 100 \text{JPY/cm}^3$。

## 5. Claude Code向け実装ロードマップ (Step-by-Step)

現状、Phase 1, 2のコアロジックは実装済みである。これらを統合し、エンドユーザー体験として完成させるための残タスクを以下に定義する。

### Phase 3: Application Logic (UI/UX Integration)

すでに2Dでの進化（`BreederGrid`）は動作している。ここから「キーホルダーを作る」体験へと昇華させる。

1. **`src/components/ThreeViewer.tsx` (New)**:
    - Three.jsの `<Canvas>` を使用した3Dビューワーコンポーネント。
    - `OrbitControls` で回転・拡大縮小操作を提供。
    - `Center`, `Stage` (drei) を使ってモデルを美しくライティング・配置。

2. **`src/components/InspectorModal.tsx` (New)**:
    - ユーザーが個体をクリック（または詳細ボタン押下）した際に開くモーダル。
    - 内部で `voxelizer` と `marchingCubes` を実行し、生成されたGeometryを `ThreeViewer` に渡す。
    - ※処理が重いため、`useEffect` 内で非同期に実行し、計算中はローディング表示を行う。

3. **`src/components/BreederGrid.tsx` (Update)**:
    - 既存のクリック（進化）に加え、「詳細を見る」アクション（例：虫眼鏡アイコン）を追加。
    - `InspectorModal` の開閉状態を管理。

### Phase 4: Export & Production (Guardrails)

1. **`src/lib/exporter/stl.ts` (New)**:
    - Three.jsの `STLExporter` をラップする、またはバイナリSTL生成ロジックを実装。
    - 生成されたGeometryを受け取り、`Blob` を生成してダウンロードさせる。
    - ファイル名: `accidental-keychain-[genome-id].stl`

2. **`src/components/ExportPanel.tsx` (New)**:
    - `InspectorModal` 内に配置する操作パネル。
    - **機能**:
        - 解像度切替: `Preview (32^3)`, `High (64^3)`, `Print (100^3)`。
        - **Download STL**: 生成されたSTLをダウンロード。
        - **Cost Estimator**: 体積に基づいた概算コスト表示（例: `Volume: 12.5 cm³, Est. Cost: ¥1,500`）。

## 6. プロンプト集 (Command Prompts for Claude Code)

Claude Codeに指示を出す際は、システムプロンプトとして「あなたは実装担当のシニアエンジニアです」と設定し、以下のコマンドを使用する。

- **初期構築**:
  > `/build "The Accidental Keychain" MVP. Stack: Next.js (App Router), TypeScript, Three.js, Tailwind CSS. Design System: Minimalist Black & White. No server required.`

- **CPPN実装**:
  > `/implement Implement the CPPN core logic in 'src/lib/cppn'. Follow the 'Data Schema' defined in the Design Doc. Include 'Sin', 'Cos', 'Gaussian', 'Sigmoid' activations. Create unit tests for genome mutation.`

- **3Dパイプライン実装**:
  > `/implement Create 'src/lib/mesher/voxelizer.ts' and 'marchingCubes.ts'. The voxelizer should query the CPPN network for a 50x50x50 grid. Implement a morphological filter (erode then dilate) to clean noise before meshing.`

- **Inspector & Export実装**:
  > `/implement Create 'src/components/ThreeViewer.tsx' using @react-three/fiber and drei. Then create 'InspectorModal.tsx' that takes a Genome, runs 'voxelizer' and 'marchingCubes', and renders the result in ThreeViewer. Add an 'Export STL' button.`

---
**検証計画:**

1. **単体テスト**: CPPNの出力が決定論的であるか、変異が正しく適用されるか。
2. **ブラウザテスト**: 50x50x50の解像度で9個体が60fpsでレンダリングされるか（重いようなら解像度調整）。
3. **STLチェック**: エクスポートされたSTLをSlicerソフトで開き、非多様体（穴など）がないか確認。
