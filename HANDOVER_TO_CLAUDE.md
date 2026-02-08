# HANDOVER_TO_CLAUDE.md

## プロジェクト: Picbraeder (The Accidental Keychain)

Antigravity agentからの引き継ぎドキュメントです。
現在のプロジェクト状態、実装済みの機能、および直近で取り組むべきタスクをまとめています。

### 1. 現在のステータス

**フェーズ**: Phase 2 (2D進化) 完了 / Phase 3 (3Dプレビュー・連携) 実装中

| 機能 | 状態 | 備考 |
|------|------|------|
| **CPPN-NEAT (Core)** | ✅ 完了 | `src/lib/cppn/` に実装済み。 |
| **2D進化 (BreederGrid)** | ✅ 完了 | シフトクリックでの複数選択、自動探索などの機能込み。 |
| **マイページ (MyPage)** | ✅ 完了 | 履歴保存、セッション再開、作品管理機能。`localStorage` ベース。 |
| **SUZURI連携 (API)** | ✅ 完了 | `src/app/api/suzuri/` に実装済み。画像からアイテム作成が可能。 |
| **3D Viewer** | ⚠️ 未統合 | `src/components/ThreeViewer.tsx` は作成済みだが、アプリ組み込みが未完了。 |
| **Inspector (Preview)** | 🚧 途中 | `InspectorModal.tsx` は現在 **2Dプレビュー** のみ実装。3D化が必要。 |

### 2. 直近の変更点 (要確認)

- **UIの日本語化**: ユーザー向けのインターフェース（ボタン、説明文など）は日本語で統一されています。
- **ブランド名の英語化**: サイトタイトルやSUZURI上の商品名（`Picbraeder Keychain`）は英語で統一されています。
- **SUZURI API連携**: `.env.local` に `SUZURI_API_KEY` が必要です。

### 3. 次に取り組むべきタスク (Next Actions)

最も優先度が高いのは、**3Dプレビュー機能の統合** です。

#### 1. `InspectorModal.tsx` への 3D Viewer 統合

現在、`InspectorModal` は2Dキャンバスを表示していますが、これを3D表示に切り替える（または切り替え可能にする）必要があります。

- **現状**: `src/components/InspectorModal.tsx` は `ThumbnailCanvas` 的なロジックで動いている。
- **ゴール**: `src/lib/mesher/voxelizer.ts` と `marchingCubes.ts` (実装済み) を使用してジオメトリを生成し、`src/components/ThreeViewer.tsx` (実装済み) で表示する。
- **注意点**: 計算が重いため、`Web Worker` の導入や非同期処理のUIフィードバック（Loading表示）が重要になります。

#### 2. STLエクスポート機能の追加

3Dプリント用に `.stl` ファイルをダウンロードする機能が未実装です。

- `InspectorModal` 内にエクスポートボタンを追加してください。

### 4. 検証・引き継ぎ手順

Claude Codeで作業を開始する際は、以下のステップで環境を確認してください。

1. **環境変数の確認**:
   `.env.local` ファイルを確認し、SUZURI APIキーが設定されているか確認。（セキュリティのため、内容は表示させずに存在確認のみ行うこと）

2. **動作確認**:

   ```bash
   npm run dev
   ```

   - ブラウザで `http://localhost:3000` を開く。
   - グリッドの個体をクリックして進化が進むか確認。
   - 「購入する」ボタンを押してモーダルが開くか確認（現在は2Dプレビュー）。
   - 右上のメニューから「My Page」に移動し、履歴が保存されているか確認。

### 5. ディレクトリ構造・主要ファイル

- `src/components/InspectorModal.tsx`: **改修対象**。2DプレビューおよびSUZURI連携パネル。
- `src/components/ThreeViewer.tsx`: **統合対象**。3D表示用コンポーネント。
- `src/app/api/suzuri/route.ts`: SUZURI連携のバックエンドロジック。
- `src/store/userStore.tsx`: ユーザーデータ（履歴・作品）の永続化ロジック。

---
**メモ**: グローバルルールに従い、思考プロセスと出力は**日本語**で行ってください。ただし、コード内の変数名やコミットメッセージ、生成される商品名は英語を使用してください。
