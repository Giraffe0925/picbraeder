'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';

const USER_DATA_PREFIX = 'picbraeder_user_';

/** セッション履歴の型 */
export interface SessionHistory {
    id: string;
    name: string;
    session: SessionData;
    thumbnail?: string;
    createdAt: number;
}

export interface UserData {
    savedWorks: SavedWork[];
    session: SessionData | null;
    history: SessionHistory[];
}

export interface SavedWork {
    genome: unknown;
    name: string;
    savedAt: number;
}

export interface SessionData {
    generation: number;
    population: unknown[];
    archiveSize: number;
    savedAt: number;
}

interface UserContextType {
    currentUser: string | null;
    isLoggedIn: boolean;
    userData: UserData | null;
    userImage: string | null;
    saveUserData: (data: Partial<UserData>) => void;
    saveToHistory: (name: string, thumbnail?: string) => void;
    deleteHistory: (historyId: string) => void;
    deleteSavedWork: (index: number) => void;
}

const UserContext = createContext<UserContextType | null>(null);

function loadUserData(userId: string): UserData {
    if (typeof window === 'undefined') return { savedWorks: [], session: null, history: [] };
    try {
        const raw = localStorage.getItem(USER_DATA_PREFIX + userId);
        if (!raw) return { savedWorks: [], session: null, history: [] };
        const data = JSON.parse(raw) as UserData;
        // 履歴がない場合は空配列を追加
        if (!data.history) data.history = [];
        return data;
    } catch {
        return { savedWorks: [], session: null, history: [] };
    }
}

function saveUserDataToStorage(userId: string, data: UserData): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_DATA_PREFIX + userId, JSON.stringify(data));
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function UserProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const [userData, setUserData] = useState<UserData | null>(null);

    // NextAuthセッションからユーザー情報を取得
    const currentUser = session?.user?.name || session?.user?.email || null;
    const userId = session?.user?.id || null;
    const userImage = session?.user?.image || null;
    const isLoggedIn = status === 'authenticated' && !!session?.user;

    // セッション変更時にユーザーデータをロード
    useEffect(() => {
        if (userId) {
            setUserData(loadUserData(userId));
        } else {
            setUserData(null);
        }
    }, [userId]);

    const saveUserData = useCallback((data: Partial<UserData>) => {
        if (!userId) return;
        setUserData(prev => {
            const updated: UserData = {
                savedWorks: data.savedWorks ?? prev?.savedWorks ?? [],
                session: data.session ?? prev?.session ?? null,
                history: data.history ?? prev?.history ?? [],
            };
            saveUserDataToStorage(userId, updated);
            return updated;
        });
    }, [userId]);

    const saveToHistory = useCallback((name: string, thumbnail?: string) => {
        if (!userId || !userData?.session) return;

        const historyEntry: SessionHistory = {
            id: generateId(),
            name,
            session: { ...userData.session },
            thumbnail,
            createdAt: Date.now(),
        };

        setUserData(prev => {
            if (!prev) return prev;
            const updated: UserData = {
                ...prev,
                history: [historyEntry, ...prev.history],
            };
            saveUserDataToStorage(userId, updated);
            return updated;
        });
    }, [userId, userData?.session]);

    const deleteHistory = useCallback((historyId: string) => {
        if (!userId) return;

        setUserData(prev => {
            if (!prev) return prev;
            const updated: UserData = {
                ...prev,
                history: prev.history.filter(h => h.id !== historyId),
            };
            saveUserDataToStorage(userId, updated);
            return updated;
        });
    }, [userId]);

    const deleteSavedWork = useCallback((index: number) => {
        if (!userId) return;

        setUserData(prev => {
            if (!prev || !prev.savedWorks) return prev;
            const newSavedWorks = [...prev.savedWorks];
            newSavedWorks.splice(index, 1);

            const updated: UserData = {
                ...prev,
                savedWorks: newSavedWorks,
            };
            saveUserDataToStorage(userId, updated);
            return updated;
        });
    }, [userId]);

    const value: UserContextType = {
        currentUser,
        isLoggedIn,
        userData,
        userImage,
        saveUserData,
        saveToHistory,
        deleteHistory,
        deleteSavedWork,
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser(): UserContextType {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
