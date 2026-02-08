'use client';

/**
 * LoginModal.tsx — ログイン・登録用モーダル
 */

import { useState } from 'react';
import { useUser } from '@/store/userStore';

interface LoginModalProps {
    onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
    const [username, setUsername] = useState('');
    const { login } = useUser();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (username.trim()) {
            login(username.trim());
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative bg-neutral-950 border border-neutral-800 p-6 w-80 max-w-[90vw]"
                onClick={e => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 right-3 text-neutral-500 hover:text-white transition-colors"
                >
                    &times;
                </button>

                <h2 className="text-lg font-medium text-white mb-4">ログイン / 登録</h2>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm text-neutral-400 mb-2">
                            ユーザー名
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="例: yamada_taro"
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                            autoFocus
                        />
                    </div>

                    <p className="text-xs text-neutral-500 mb-4">
                        ※ ユーザー名を入力するだけでログインできます。<br />
                        初めての場合は自動的に登録されます。
                    </p>

                    <button
                        type="submit"
                        disabled={!username.trim()}
                        className="w-full py-2 bg-orange-600 text-white font-medium hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        ログイン
                    </button>
                </form>
            </div>
        </div>
    );
}
