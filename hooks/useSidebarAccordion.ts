import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';

export type ExpandedGroupsMap = Record<string, boolean>;

const DEFAULT_EXPANDED: ExpandedGroupsMap = {
  GESTIONE: true,
  ALLENAMENTO: true,
  'ALIMENTAZIONE & NUTRIZIONE': true,
  COMMERCIALE: true,
  STRUMENTI: true,
};

export function useSidebarAccordion(allGroupTitles: string[]) {
  const [expandedGroups, setExpandedGroups] = useState<ExpandedGroupsMap>(() => {
    return getStorageItem<ExpandedGroupsMap>(
      STORAGE_KEYS.SIDEBAR_EXPANDED_GROUPS,
      DEFAULT_EXPANDED
    );
  });

  // Salva ogni cambio di stato in localStorage tramite chiavi centralizzate
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.SIDEBAR_EXPANDED_GROUPS, expandedGroups);
  }, [expandedGroups]);

  // Alterna lo stato di una singola sezione
  const toggleGroup = useCallback((title: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  }, []);

  // Espandi tutte le sezioni
  const expandAll = useCallback(() => {
    const next: ExpandedGroupsMap = {};
    allGroupTitles.forEach((title) => {
      next[title] = true;
    });
    setExpandedGroups(next);
  }, [allGroupTitles]);

  // Comprimi tutte le sezioni
  const collapseAll = useCallback(() => {
    const next: ExpandedGroupsMap = {};
    allGroupTitles.forEach((title) => {
      next[title] = false;
    });
    setExpandedGroups(next);
  }, [allGroupTitles]);

  const areAllCollapsed = allGroupTitles.every((title) => !expandedGroups[title]);

  return {
    expandedGroups,
    toggleGroup,
    expandAll,
    collapseAll,
    areAllCollapsed,
  };
}
