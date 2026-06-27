// lib/parentChild.tsx
// Shared "All Children / per-child" selection for every parent screen — the RN
// mirror of the web app's lib/parent-child.tsx. The parent layout mounts the
// provider once; screens read the selection via useParentChild() and render the
// <ChildSwitcher/> "VIEWING" row. Selection persists across screens (and app
// launches) via AsyncStorage, exactly like the web localStorage flow.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchChildren } from '@/lib/db';
import { useAuth } from '@/lib/auth';

export interface ChildOption {
  id: string;
  name: string;
  avatar: string | null;
}

interface Ctx {
  children: ChildOption[];
  loading: boolean;
  selectedChildId: string; // 'all' or a child id
  setSelectedChildId: (id: string) => void;
  effectiveChildIds: string[]; // all ids when 'all', else [selected]
  isAll: boolean;
  reload: () => void;
}

const ParentChildContext = createContext<Ctx | null>(null);
const STORAGE_KEY = 'qmg_parent_selected_child';

export function ParentChildProvider({ children: node }: { children: ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user?.id;
  const [kids, setKids] = useState<ChildOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildIdState] = useState<string>('all');

  const load = useCallback(async () => {
    if (!uid) {
      setKids([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const kids = await fetchChildren(uid);
      const list: ChildOption[] = kids
        .map((c) => ({
          id: c.id,
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Child',
          avatar: c.avatar_url ?? null,
        }))
        .filter((c) => c.id);
      setKids(list);

      // Restore the persisted selection if it is still valid.
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && (saved === 'all' || list.some((c) => c.id === saved))) {
          setSelectedChildIdState(saved);
        } else if (saved && !list.some((c) => c.id === saved)) {
          setSelectedChildIdState('all');
        }
      } catch {
        /* ignore storage errors */
      }
    } catch {
      setKids([]);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  const setSelectedChildId = useCallback((id: string) => {
    setSelectedChildIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, []);

  const isAll = selectedChildId === 'all';
  const effectiveChildIds = isAll ? kids.map((k) => k.id) : [selectedChildId];

  return (
    <ParentChildContext.Provider
      value={{ children: kids, loading, selectedChildId, setSelectedChildId, effectiveChildIds, isAll, reload: load }}
    >
      {node}
    </ParentChildContext.Provider>
  );
}

export function useParentChild(): Ctx {
  const ctx = useContext(ParentChildContext);
  // Safe fallback if a screen renders outside the provider.
  if (!ctx) {
    return {
      children: [],
      loading: false,
      selectedChildId: 'all',
      setSelectedChildId: () => {},
      effectiveChildIds: [],
      isAll: true,
      reload: () => {},
    };
  }
  return ctx;
}
