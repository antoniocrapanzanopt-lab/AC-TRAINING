import { useState, useCallback, useEffect } from 'react';
import { Factor } from '@supabase/supabase-js';
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
  const [factors, setFactors] = useState<Factor[]>([]);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore nel caricamento dello stato MFA';
      console.error('Error loading MFA:', msg);
      setMfaState(prev => ({ ...prev, isLoading: false, error: msg }));
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      console.warn('Error cleaning up unverified factors:', msg);
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
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ 
        factorType: 'totp',
        issuer: 'Builder Athlete Manager'
      });
      if (enrollError) throw enrollError;
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante la registrazione MFA';
      console.error('Enroll error:', err);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [cleanupUnverifiedFactors]);

  const challengeFactor = useCallback(async (factorId: string) => {
    try {
      const { data, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante la challenge MFA';
      console.error('Challenge error:', err);
      setError(msg);
      return null;
    }
  }, []);

  const verifyFactor = useCallback(async (factorId: string, challengeId: string, code: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
      if (verifyError) throw verifyError;
      
      // Assicura l'immediato passaggio ad aal2 nello stato React locale per sbloccare la navigazione
      setMfaState(prev => ({
        ...prev,
        currentAAL: 'aal2',
        hasVerifiedFactors: true,
        isLoading: false,
        error: null
      }));

      await loadMFAStatus();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Codice non valido o scaduto';
      console.error('Verify error:', err);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadMFAStatus]);

  const unenrollFactor = useCallback(async (factorId: string) => {
    setLoading(true);
    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
      if (unenrollError) throw unenrollError;
      await loadMFAStatus();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante la rimozione del fattore MFA';
      setError(msg);
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
