/**
 * SUZURI API 設定
 */

export const SUZURI_CONFIG = {
    apiBase: 'https://suzuri.jp/api/v1',
    /** アイテムID一覧（https://suzuri.jp/api/v1/items から取得） */
    itemIds: {
        acrylic_keychain: 147,  // アクリルキーホルダー（正しいID）
        sticker: 3,              // ステッカー
        tshirt: 1,               // Tシャツ
        mug: 5,                  // マグカップ
    },
    /** デフォルトで作成するアイテム */
    defaultItems: [147],  // アクリルキーホルダーのみ
};
