import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MFAState } from '../types';

export const useMFA = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaState, setMfaState] = useState<MFAState>({
    currentAAL: null,
    nextAAL: null,
    hasVerifiedFactors: false,
    hasUnverifiedFactors: false,
    isLoading: true,
    error: null
  });
  const [factors, setFactors] = useState<any[]>([]);

  const loadMFAStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMfaState({
          currentAAL: null,
          nextAAL: null,
          hasVerifiedFactors: false,
          hasUnverifiedFactors: false,
          isLoading: false,
          error: null
        });
        setFactors([]);
        return;
      }

      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;

      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const allFactors = factorsData?.all || [];
      const verified = allFactors.some(f => f.status === 'verified');
      const unverified = allFactors.some(f => f.status === 'unverified');

      setFactors(allFactors);
      setMfaState({
        currentAAL: (aalData?.currentLevel as 'aal1' | 'aal2') || 'aal1',
        nextAAL: (aalData?.nextLevel as 'aal2' | null) || null,
        hasVerifiedFactors: verified,
        hasUnverifiedFactors: unverified,
        isLoading: false,
        error: null
      });
    } catch (err: any) {
      console.error('Error loading MFA:', err.message);
      setMfaState(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    loadMFAStatus();
  }, [loadMFAStatus]);

  const cleanupUnverifiedFactors = useCallback(async () => {
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const allFactors = factorsData?.all || [];
      const unverified = allFactors.filter(f => f.status === 'unverified');
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      return true;
    } catch (err: any) {
      console.warn('Error cleaning up unverified factors:', err?.message);
      return false;
    }
  }, []);

  const enrollTOTP = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Pulizia preventiva dei fattori non verificati rimasti appesi
      await cleanupUnverifiedFactors();

      // 2. Registrazione del nuovo fattore TOTP
      const { data, error } = await supabase.auth.mfa.enroll({ 
        factorType: 'totp',
        issuer: 'Builder Athlete Manager'
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Enroll error:', err);
      setError(err.message || 'Errore durante la registrazione MFA');
      return null;
    } finally {
      setLoading(false);
    }
  }, [cleanupUnverifiedFactors]);

  const challengeFactor = useCallback(async (factorId: string) => {
    try {
      const { data, error } = await supabase.auth.mfa.challenge({ factorId });
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Challenge error:', err);
      setError(err.message);
      return null;
    }
  }, []);

  const verifyFactor = useCallback(async (factorId: string, challengeId: string, code: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
      if (error) throw error;
      await loadMFAStatus();
      return true;
    } catch (err: any) {
      console.error('Verify error:', err);
      setError(err.message || 'Codice non valido o scaduto');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadMFAStatus]);

  const unenrollFactor = useCallback(async (factorId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await loadMFAStatus();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadMFAStatus]);

  const getPrimaryFactor = useCallback(() => {
    return factors.find(f => f.status === 'verified');
  }, [factors]);

  return {
    mfaState,
    factors,
    loading,
    error,
    loadMFAStatus,
    enrollTOTP,
    challengeFactor,
    verifyFactor,
    unenrollFactor,
    cleanupUnverifiedFactors,
    getPrimaryFactor
  };
};
