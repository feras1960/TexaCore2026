/**
 * useCompany Hook
 * React hook for managing company data
 * Gets company from user profile (if authenticated) or falls back to first company
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { companiesService, type Company } from '@/services/companiesService';
import { userProfilesService } from '@/services/userProfilesService';

interface UseCompanyReturn {
  company: Company | null;
  companyId: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useCompany(autoFetch: boolean = true): UseCompanyReturn {
  const { user, isAuthenticated } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to track if we've already fetched to prevent multiple fetches
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  const fetchCompany = useCallback(async (force: boolean = false) => {
    // Prevent concurrent fetches and unnecessary re-fetches
    if (isFetchingRef.current) return;
    if (!force && hasFetchedRef.current && company) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      let targetCompanyId: string | null = null;

      // Try to get company from user profile if authenticated
      if (isAuthenticated && user) {
        try {
          const profile = await userProfilesService.getByUserId(user.id);
          if (profile?.company_id) {
            targetCompanyId = profile.company_id;
          }
        } catch {
          // Ignore profile errors, fall back to first company
        }
      }

      // If we have companyId from profile, fetch that company
      if (targetCompanyId) {
        const data = await companiesService.getById(targetCompanyId);
        if (data) {
          setCompany(data);
          hasFetchedRef.current = true;
        }
      } else {
        // Fallback: get first company (for development/testing)
        const data = await companiesService.getFirst();
        if (data) {
          setCompany(data);
          hasFetchedRef.current = true;
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch company');
      setError(error);
      console.error('Error fetching company:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, isAuthenticated, company]);

  const refetch = useCallback(async () => {
    await fetchCompany(true); // Force refetch
  }, [fetchCompany]);

  useEffect(() => {
    if (autoFetch && !hasFetchedRef.current) {
      fetchCompany();
    }
  }, [autoFetch]); // Remove fetchCompany from deps to prevent re-triggers

  return {
    company,
    companyId: company?.id || null,
    loading,
    error,
    refetch,
  };
}

export default useCompany;
