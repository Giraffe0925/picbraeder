'use client';

/**
 * Evolution Store — Context-based state management for the breeder UI.
 *
 * Novelty Search 統合 + ブランチング + 複数親選択
 * セッション保存・復元機能付き
 * 進化履歴の記録機能付き
 */

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from 'react';
import {
  type Genome,
  createInitialPopulation,
  breedNextGeneration,
  mutate,
} from '@/lib/cppn/genome';
import {
  evaluateNovelty,
  exploreNovelty,
  resetNoveltyArchive,
  getNoveltyArchive,
} from '@/lib/cppn/noveltySearch';
import type { SavedWork } from '@/lib/cppn/savedWorks';
import { useUser } from '@/store/userStore';
import { trackEvolutionEvent, type EvolutionEvent } from '@/lib/analytics/evolutionTracker';

const GRID_SIZE = 9; // 3 × 3
const EXPLORE_CANDIDATES = 20;

export interface SessionData {
  generation: number;
  population: Genome[];
  archiveSize: number;
  savedAt: number;
}

export interface EvolutionState {
  generation: number;
  population: Genome[];
  autoExploreEnabled: boolean;
  archiveSize: number;
  selectedIds: Set<string>;
  savedWorks: SavedWork[];
}

interface EvolutionContextType extends EvolutionState {
  select: (genome: Genome) => void;
  toggleSelect: (genomeId: string) => void;
  breedFromSelected: () => void;
  selectParent: (genome: Genome) => void;
  reset: () => void;
  autoExplore: () => void;
  save: (genome: Genome, name: string) => void;
  removeSaved: (index: number) => void;
  loadSession: (session: SessionData) => void;
}

const EvolutionContext = createContext<EvolutionContextType | null>(null);

export function EvolutionProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, userId, userEmail, currentUser, userData, saveUserData } = useUser();

  const [state, setState] = useState<EvolutionState>(() => ({
    generation: 0,
    population: createInitialPopulation(GRID_SIZE),
    autoExploreEnabled: false,
    archiveSize: 0,
    selectedIds: new Set(),
    savedWorks: [],
  }));

  // ログイン時にセッションを復元
  useEffect(() => {
    if (isLoggedIn && userData) {
      // 保存作品を復元
      if (userData.savedWorks && userData.savedWorks.length > 0) {
        setState(prev => ({
          ...prev,
          savedWorks: userData.savedWorks as SavedWork[],
        }));
      }

      // セッションを復元
      if (userData.session) {
        const session = userData.session as SessionData;
        setState(prev => ({
          ...prev,
          generation: session.generation,
          population: session.population,
          archiveSize: session.archiveSize,
        }));
      }
    }
  }, [isLoggedIn, userData]);

  // セッションを保存するヘルパー関数
  const saveSession = useCallback((newState: EvolutionState) => {
    if (!isLoggedIn) return;

    const sessionData: SessionData = {
      generation: newState.generation,
      population: newState.population,
      archiveSize: newState.archiveSize,
      savedAt: Date.now(),
    };

    saveUserData({
      session: sessionData,
      savedWorks: newState.savedWorks,
    });
  }, [isLoggedIn, saveUserData]);

  const select = useCallback((genome: Genome) => {
    setState(prev => {
      // 選択しなかったパターンのID
      const rejectedIds = prev.population
        .filter(g => g.id !== genome.id)
        .map(g => g.id);

      // 進化履歴を記録
      const event: EvolutionEvent = {
        userId: userId || 'anonymous',
        userEmail: userEmail || undefined,
        userName: currentUser || undefined,
        timestamp: Date.now(),
        generation: prev.generation + 1,
        selectedGenomeId: genome.id,
        rejectedGenomeIds: rejectedIds,
        actionType: 'select',
      };
      trackEvolutionEvent(event);

      const parent: Genome = {
        id: genome.id,
        fitness: 1,
        nodes: genome.nodes.map(n => ({ ...n })),
        connections: genome.connections.map(c => ({ ...c })),
      };
      const children = breedNextGeneration([parent], GRID_SIZE);
      let population = children;
      try { population = evaluateNovelty(children); } catch { /* optional */ }
      const archiveSize = getNoveltyArchive().size;

      const newState = {
        ...prev,
        generation: prev.generation + 1,
        population,
        archiveSize,
        selectedIds: new Set<string>(),
      };
      saveSession(newState);
      return newState;
    });
  }, [saveSession, userData]);

  const toggleSelect = useCallback((genomeId: string) => {
    setState(prev => {
      const next = new Set(prev.selectedIds);
      if (next.has(genomeId)) {
        next.delete(genomeId);
      } else {
        next.add(genomeId);
      }
      return { ...prev, selectedIds: next };
    });
  }, []);

  const breedFromSelected = useCallback(() => {
    setState(prev => {
      const parents = prev.population
        .filter(g => prev.selectedIds.has(g.id))
        .map(g => ({ ...g, fitness: 1 }));
      if (parents.length === 0) return prev;

      // 選択しなかったパターンのID
      const rejectedIds = prev.population
        .filter(g => !prev.selectedIds.has(g.id))
        .map(g => g.id);

      // 進化履歴を記録
      const event: EvolutionEvent = {
        userId: userId || 'anonymous',
        userEmail: userEmail || undefined,
        userName: currentUser || undefined,
        timestamp: Date.now(),
        generation: prev.generation + 1,
        selectedGenomeId: parents.map(p => p.id).join(','),
        rejectedGenomeIds: rejectedIds,
        actionType: 'breed',
      };
      trackEvolutionEvent(event);

      const children = breedNextGeneration(parents, GRID_SIZE);
      let population = children;
      try { population = evaluateNovelty(children); } catch { /* optional */ }

      const newState = {
        ...prev,
        generation: prev.generation + 1,
        population,
        archiveSize: getNoveltyArchive().size,
        selectedIds: new Set<string>(),
      };
      saveSession(newState);
      return newState;
    });
  }, [saveSession, userId, userEmail, currentUser]);

  const selectParent = useCallback((genome: Genome) => {
    const parent: Genome = {
      id: genome.id,
      fitness: 1,
      nodes: genome.nodes.map(n => ({ ...n })),
      connections: genome.connections.map(c => ({ ...c })),
    };
    const children = breedNextGeneration([parent], GRID_SIZE);
    let population = children;
    try { population = evaluateNovelty(children); } catch { /* optional */ }
    const archiveSize = getNoveltyArchive().size;

    setState(prev => {
      const newState = {
        ...prev,
        generation: prev.generation + 1,
        population,
        archiveSize,
        selectedIds: new Set<string>(),
      };
      saveSession(newState);
      return newState;
    });
  }, [saveSession]);

  const autoExplore = useCallback(() => {
    setState(prev => {
      const evaluated = evaluateNovelty(prev.population);
      const sortedByNovelty = [...evaluated].sort(
        (a, b) => (b.novelty ?? 0) - (a.novelty ?? 0),
      );
      const bestNovel = sortedByNovelty[0];

      // 進化履歴を記録
      const event: EvolutionEvent = {
        userId: userId || 'anonymous',
        userEmail: userEmail || undefined,
        userName: currentUser || undefined,
        timestamp: Date.now(),
        generation: prev.generation + 1,
        selectedGenomeId: bestNovel.id,
        rejectedGenomeIds: prev.population.filter(g => g.id !== bestNovel.id).map(g => g.id),
        actionType: 'auto-explore',
      };
      trackEvolutionEvent(event);

      const newChildren: Genome[] = [];
      newChildren.push({ ...bestNovel, fitness: 0 });

      while (newChildren.length < GRID_SIZE) {
        const parent =
          sortedByNovelty[Math.floor(Math.random() * Math.min(3, sortedByNovelty.length))];
        const novel = exploreNovelty(parent, EXPLORE_CANDIDATES, mutate);
        newChildren.push(novel);
      }

      const newState = {
        ...prev,
        generation: prev.generation + 1,
        population: newChildren.slice(0, GRID_SIZE),
        archiveSize: getNoveltyArchive().size,
        selectedIds: new Set<string>(),
      };
      saveSession(newState);
      return newState;
    });
  }, [saveSession, userId, userEmail, currentUser]);

  const save = useCallback((genome: Genome, name: string) => {
    setState(prev => {
      const newWork: SavedWork = {
        genome,
        name,
        savedAt: Date.now(),
      };
      const newSavedWorks = [...prev.savedWorks, newWork];
      const newState = { ...prev, savedWorks: newSavedWorks };
      saveSession(newState);
      return newState;
    });
  }, [saveSession]);

  const removeSaved = useCallback((index: number) => {
    setState(prev => {
      const newSavedWorks = [...prev.savedWorks];
      newSavedWorks.splice(index, 1);
      const newState = { ...prev, savedWorks: newSavedWorks };
      saveSession(newState);
      return newState;
    });
  }, [saveSession]);

  const reset = useCallback(() => {
    resetNoveltyArchive();
    const newState: EvolutionState = {
      generation: 0,
      population: createInitialPopulation(GRID_SIZE),
      autoExploreEnabled: false,
      archiveSize: 0,
      selectedIds: new Set<string>(),
      savedWorks: state.savedWorks, // 保存作品は維持
    };
    saveSession(newState);
    setState(newState);
  }, [saveSession, state.savedWorks]);

  const loadSession = useCallback((session: SessionData) => {
    setState(prev => ({
      ...prev,
      generation: session.generation,
      population: session.population,
      archiveSize: session.archiveSize,
    }));
  }, []);

  return (
    <EvolutionContext.Provider
      value={{
        ...state,
        select,
        toggleSelect,
        breedFromSelected,
        selectParent,
        reset,
        autoExplore,
        save,
        removeSaved,
        loadSession,
      }}
    >
      {children}
    </EvolutionContext.Provider>
  );
}

export function useEvolutionStore(): EvolutionContextType {
  const context = useContext(EvolutionContext);
  if (!context) {
    throw new Error('useEvolutionStore must be used within an EvolutionProvider');
  }
  return context;
}
