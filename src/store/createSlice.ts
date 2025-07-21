import { create, StateCreator } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Helper that builds a Zustand slice with `devtools` + `persist` middleware
 * so every store follows the same pattern.
 *
 * @param name   Unique storage key for the slice (used by persist)
 * @param slice  State creator function
 */
export function createSlice<T>(name: string, slice: StateCreator<T>) {
  return create<T>()(devtools(persist(slice, { name })));
} 