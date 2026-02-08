'use client';

import { useState, useEffect } from 'react';
import BreederGrid from '@/components/BreederGrid';
import MyPage from '@/components/MyPage';
import CommunityDesignsModal from '@/components/CommunityDesignsModal';
import { EvolutionProvider, useEvolutionStore, type SessionData } from '@/store/evolutionStore';
import { UserProvider, useUser, type SessionHistory } from '@/store/userStore';
import UserMenu from '@/components/UserMenu';
import { isAdmin } from '@/lib/analytics/evolutionTracker';
import type { Genome } from '@/lib/cppn/genome';

/** メインアプリケーションのラッパー（内部コンポーネント） */
function AppContent() {
  const { isLoggedIn, userEmail, userData, saveToHistory } = useUser();
  const isAdminUser = isAdmin(userEmail);
  const evolution = useEvolutionStore();
  const [showMyPage, setShowMyPage] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
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

  /** コミュニティデザインを親として選択 */
  const handleSelectCommunityDesign = (genome: Genome) => {
    evolution.selectParent(genome);
    setShowCommunity(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-12 gap-8 relative">
      {/* Header with User Menu */}
      <header className="w-full max-w-4xl flex justify-between items-start relative z-50 gap-4">
        <div className="text-left shrink-0">
          <h1 className="text-xl font-light tracking-[0.2em] uppercase">
            The Accidental Keychain
          </h1>
          <p className="mt-1 text-xs text-neutral-500 tracking-wide">
            Select. Evolve. Discover.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* コミュニティ作品ボタン */}
          <button
            type="button"
            onClick={() => setShowCommunity(true)}
            className="px-3 py-1.5 text-sm border border-orange-600 text-orange-400 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-colors whitespace-nowrap"
          >
            🌐 他作品を親に
          </button>
          {isLoggedIn && (
            <button
              type="button"
              onClick={() => setShowMyPage(!showMyPage)}
              className="px-3 py-1.5 text-sm border border-neutral-600 text-neutral-400 hover:text-white hover:border-neutral-400 transition-colors whitespace-nowrap"
            >
              {showMyPage ? '← Back' : '📁 My Page'}
            </button>
          )}
          {/* 管理者のみ表示 */}
          {isAdminUser && (
            <a
              href="/admin"
              className="px-3 py-1.5 text-sm border border-purple-600 text-purple-400 hover:bg-purple-500 hover:text-white hover:border-purple-500 transition-colors whitespace-nowrap"
            >
              🔧 管理
            </a>
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

      {/* Community Designs Modal */}
      {showCommunity && (
        <CommunityDesignsModal
          onSelect={handleSelectCommunityDesign}
          onClose={() => setShowCommunity(false)}
        />
      )}
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
