import { useState, useCallback, useEffect } from 'react';
import { Factor } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { MFAState } from '../types';

export const useMFA = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaState, setMfaState] = useState<MFAState>(() => {
    // Inizializzazione non bloccante (isLoading: false per non bloccare il critical path)
    return {
      currentAAL: null,
      nextAAL: null,
      hasVerifiedFactors: false,
      hasUnverifiedFactors: false,
      isLoading: false,
      error: null,
    };
  });
  const [factors, setFactors] = useState<Factor[]>([]);

  const loadMFAStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setMfaState({
          currentAAL: null,
          nextAAL: null,
          hasVerifiedFactors: false,
          hasUnverifiedFactors: false,
          isLoading: false,
          error: null,
        });
        setFactors([]);
        return;
      }

      // 1. Estrazione rapida sincrona da JWT sessione (0 ms)
      let fastAAL: 'aal1' | 'aal2' = 'aal1';
      try {
        const token = session.access_token;
        if (token) {
          const payloadPart = token.split('.')[1];
          if (payloadPart) {
            const decoded = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')));
            if (decoded?.aal === 'aal2' || decoded?.aal === 'aal1') {
              fastAAL = decoded.aal;
            }
          }
        }
      } catch {}

      // 2. Lettura cache fattori verificati per utente
      const userId = session.user.id;
      const cachedVerified = localStorage.getItem(`ac_mfa_has_verified_${userId}`) === 'true';

      // Aggiornamento immediato ottimistico
      setMfaState(prev => ({
        ...prev,
        currentAAL: fastAAL,
        hasVerifiedFactors: cachedVerified || prev.hasVerifiedFactors,
      }));

      // 3. Esecuzione query MFA in parallelo senza waterfall
      const [aalRes, factorsRes] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel().catch(() => null),
        supabase.auth.mfa.listFactors().catch(() => null),
      ]);

      const allFactors = factorsRes?.data?.all || [];
      const verified = allFactors.some(f => f.status === 'verified');
      const unverified = allFactors.some(f => f.status === 'unverified');

      try {
        localStorage.setItem(`ac_mfa_has_verified_${userId}`, verified ? 'true' : 'false');
      } catch {}

      setFactors(allFactors);
      setMfaState({
        currentAAL: (aalRes?.data?.currentLevel as 'aal1' | 'aal2') || fastAAL,
        nextAAL: (aalRes?.data?.nextLevel as 'aal2' | null) || null,
        hasVerifiedFactors: verified,
        hasUnverifiedFactors: unverified,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore nel caricamento dello stato MFA';
      console.warn('[useMFA] Warning caricamento MFA:', msg);
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
