'use client';

/**
 * UserMenu.tsx — ヘッダーに表示するユーザーメニュー
 */

import { useState } from 'react';
import { useUser } from '@/store/userStore';
import LoginModal from './LoginModal';

export default function UserMenu() {
    const { currentUser, isLoggedIn, logout } = useUser();
    const [showLoginModal, setShowLoginModal] = useState(false);

    if (isLoggedIn) {
        return (
            <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-300">
                    👤 {currentUser}
                </span>
                <button
                    type="button"
                    onClick={logout}
                    className="px-3 py-1 text-sm border border-neutral-600 text-neutral-400 hover:text-white hover:border-neutral-400 transition-colors"
                >
                    ログアウト
                </button>
            </div>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-1.5 text-sm bg-orange-600 text-white hover:bg-orange-500 transition-colors"
            >
                ログイン
            </button>

            {showLoginModal && (
                <LoginModal onClose={() => setShowLoginModal(false)} />
            )}
        </>
    );
}
