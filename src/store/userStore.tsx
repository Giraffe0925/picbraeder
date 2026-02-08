'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const CURRENT_USER_KEY = 'picbraeder_current_user';
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
    login: (username: string) => void;
    logout: () => void;
    userData: UserData | null;
    saveUserData: (data: Partial<UserData>) => void;
    saveToHistory: (name: string, thumbnail?: string) => void;
    deleteHistory: (historyId: string) => void;
    deleteSavedWork: (index: number) => void;
}

const UserContext = createContext<UserContextType | null>(null);

function loadUserData(username: string): UserData {
    if (typeof window === 'undefined') return { savedWorks: [], session: null, history: [] };
    try {
        const raw = localStorage.getItem(USER_DATA_PREFIX + username);
        if (!raw) return { savedWorks: [], session: null, history: [] };
        const data = JSON.parse(raw) as UserData;
        // 履歴がない場合は空配列を追加
        if (!data.history) data.history = [];
        return data;
    } catch {
        return { savedWorks: [], session: null, history: [] };
    }
}

function saveUserDataToStorage(username: string, data: UserData): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_DATA_PREFIX + username, JSON.stringify(data));
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function UserProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const saved = localStorage.getItem(CURRENT_USER_KEY);
        if (saved) {
            setCurrentUser(saved);
            setUserData(loadUserData(saved));
        }
    }, []);

    const login = useCallback((username: string) => {
        const trimmed = username.trim();
        if (!trimmed) return;
        localStorage.setItem(CURRENT_USER_KEY, trimmed);
        setCurrentUser(trimmed);
        setUserData(loadUserData(trimmed));
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(CURRENT_USER_KEY);
        setCurrentUser(null);
        setUserData(null);
    }, []);

    const saveUserData = useCallback((data: Partial<UserData>) => {
        if (!currentUser) return;
        setUserData(prev => {
            const updated: UserData = {
                savedWorks: data.savedWorks ?? prev?.savedWorks ?? [],
                session: data.session ?? prev?.session ?? null,
                history: data.history ?? prev?.history ?? [],
            };
            saveUserDataToStorage(currentUser, updated);
            return updated;
        });
    }, [currentUser]);

    const saveToHistory = useCallback((name: string, thumbnail?: string) => {
        if (!currentUser || !userData?.session) return;

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
            saveUserDataToStorage(currentUser, updated);
            return updated;
        });
    }, [currentUser, userData?.session]);

    const deleteHistory = useCallback((historyId: string) => {
        if (!currentUser) return;

        setUserData(prev => {
            if (!prev) return prev;
            const updated: UserData = {
                ...prev,
                history: prev.history.filter(h => h.id !== historyId),
            };
            saveUserDataToStorage(currentUser, updated);
            return updated;
        });
    }, [currentUser]);

    const deleteSavedWork = useCallback((index: number) => {
        if (!currentUser) return;

        setUserData(prev => {
            if (!prev || !prev.savedWorks) return prev;
            const newSavedWorks = [...prev.savedWorks];
            newSavedWorks.splice(index, 1);

            const updated: UserData = {
                ...prev,
                savedWorks: newSavedWorks,
            };
            saveUserDataToStorage(currentUser, updated);
            return updated;
        });
    }, [currentUser]);

    const value: UserContextType = {
        currentUser,
        isLoggedIn: currentUser !== null,
        login,
        logout,
        userData,
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
