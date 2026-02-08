'use client';

import { useState, useEffect } from 'react';
import BreederGrid from '@/components/BreederGrid';
import MyPage from '@/components/MyPage';
import { EvolutionProvider, useEvolutionStore, type SessionData } from '@/store/evolutionStore';
import { UserProvider, useUser, type SessionHistory } from '@/store/userStore';
import UserMenu from '@/components/UserMenu';

/** メインアプリケーションのラッパー（内部コンポーネント） */
function AppContent() {
  const { isLoggedIn, userData, saveToHistory } = useUser();
  const evolution = useEvolutionStore();
  const [showMyPage, setShowMyPage] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // ログイン時、履歴があればマイページを表示
  useEffect(() => {
    if (isLoggedIn && userData && !initialized) {
      // すでにセッションがあるか履歴がある場合はマイページを表示
      if (userData.session || (userData.history && userData.history.length > 0)) {
        setShowMyPage(true);
      }
      setInitialized(true);
    }
  }, [isLoggedIn, userData, initialized]);

  /** 履歴からセッションを復元 */
  const handleResumeSession = (history: SessionHistory) => {
    const sessionData = history.session as SessionData;
    evolution.loadSession(sessionData);
    setShowMyPage(false);
  };

  /** 新規セッション開始 */
  const handleNewSession = () => {
    evolution.reset();
    setShowMyPage(false);
  };

  /** 履歴に保存 */
  const handleSaveToHistory = () => {
    const name = prompt('履歴の名前を入力してください:');
    if (name) {
      saveToHistory(name);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-12 gap-8 relative">
      {/* Header with User Menu */}
      <header className="w-full max-w-4xl flex justify-between items-center relative z-10">
        <div className="text-center flex-1">
          <h1 className="text-2xl font-light tracking-[0.3em] uppercase">
            Picbraeder
          </h1>
          <p className="mt-2 text-xs text-neutral-500 tracking-wide">
            Select. Evolve. Discover.
          </p>
        </div>
        <div className="absolute right-0 top-0 flex items-center gap-2">
          {isLoggedIn && (
            <button
              type="button"
              onClick={() => setShowMyPage(!showMyPage)}
              className="px-3 py-1.5 text-sm border border-neutral-600 text-neutral-400 hover:text-white hover:border-neutral-400 transition-colors"
            >
              {showMyPage ? '← Back' : '📁 My Page'}
            </button>
          )}
          <UserMenu />
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 w-full">
        {showMyPage && isLoggedIn ? (
          <div className="py-8">
            <MyPage
              onResumeSession={handleResumeSession}
              onNewSession={handleNewSession}
            />
            {/* 履歴保存ボタン（現在のセッションがある場合） */}
            {evolution.generation > 0 && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={handleSaveToHistory}
                  className="px-6 py-2 bg-blue-600 text-white text-sm hover:bg-blue-500 transition-colors"
                >
                  現在の状態を履歴に保存
                </button>
              </div>
            )}
          </div>
        ) : (
          <BreederGrid />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <UserProvider>
      <EvolutionProvider>
        <AppContent />
      </EvolutionProvider>
    </UserProvider>
  );
}
