/**
 * savedWorks.ts — LocalStorage-based persistence for user creations.
 * Supports saving, loading, and deleting "branching" works.
 */

import type { Genome } from './genome';

const STORAGE_KEY = 'picbraeder_saved_works';

export interface SavedWork {
  genome: Genome;
  name: string;
  savedAt: number; // timestamp
}

/** Load all saved works from LocalStorage. */
export function loadSavedWorks(): SavedWork[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedWork[];
  } catch {
    return [];
  }
}

/** Save a genome as a new work. */
export function saveWork(genome: Genome, name: string): SavedWork[] {
  const works = loadSavedWorks();
  works.push({ genome, name, savedAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
  return works;
}

/** Delete a saved work by index. */
export function deleteWork(index: number): SavedWork[] {
  const works = loadSavedWorks();
  works.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
  return works;
}
