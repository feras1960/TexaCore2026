// =============================================
// استوديو الإلهام - Hook إدارة التصاميم
// =============================================

import { useState, useCallback, useEffect } from 'react';
import type { DesignConcept, GalleryFilters } from '../core/types';
import {
  listDesignConcepts,
  createDesignConcept,
  deleteDesignConcept,
  listCustomerConcepts,
} from '../core/DesignConceptService';

interface UseDesignConceptsReturn {
  concepts: DesignConcept[];
  totalCount: number;
  isLoading: boolean;
  page: number;
  setPage: (p: number) => void;
  filters: GalleryFilters;
  setFilters: (f: GalleryFilters) => void;
  refresh: () => void;
  remove: (id: string) => Promise<boolean>;
}

const DEFAULT_FILTERS: GalleryFilters = {
  sortBy: 'newest',
};

/**
 * Hook لإدارة التصاميم المحفوظة (للمعرض)
 */
export function useDesignConcepts(
  initialFilters?: Partial<GalleryFilters>,
  customerId?: string,
): UseDesignConceptsReturn {
  const [concepts, setConcepts] = useState<DesignConcept[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<GalleryFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const loadConcepts = useCallback(async () => {
    setIsLoading(true);
    try {
      if (customerId) {
        const data = await listCustomerConcepts(customerId);
        setConcepts(data);
        setTotalCount(data.length);
      } else {
        const { data, count } = await listDesignConcepts(filters, page, 20);
        setConcepts(data);
        setTotalCount(count);
      }
    } catch (err) {
      console.error('[useDesignConcepts] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, customerId]);

  useEffect(() => {
    loadConcepts();
  }, [loadConcepts]);

  const refresh = useCallback(() => {
    loadConcepts();
  }, [loadConcepts]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const success = await deleteDesignConcept(id);
    if (success) {
      setConcepts(prev => prev.filter(c => c.id !== id));
      setTotalCount(prev => prev - 1);
    }
    return success;
  }, []);

  return {
    concepts,
    totalCount,
    isLoading,
    page,
    setPage,
    filters,
    setFilters,
    refresh,
    remove,
  };
}
