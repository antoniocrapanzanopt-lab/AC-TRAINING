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

      const totpFactors = factorsData?.totp || [];
      const verified = totpFactors.some(f => f.status === 'verified');
      const unverified = totpFactors.some(f => (f as any).status === 'unverified');

      // 3. Auto-cleanup di fattori unverified rimasti appesi
      if (unverified) {
        const unverifiedFactors = totpFactors.filter(f => (f as any).status === 'unverified');
        for (const f of unverifiedFactors) {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      setFactors(totpFactors.filter(f => f.status === 'verified'));
      setMfaState({
        currentAAL: (aalData?.currentLevel as 'aal1' | 'aal2') || 'aal1',
        nextAAL: (aalData?.nextLevel as 'aal2' | null) || null,
        hasVerifiedFactors: verified,
        hasUnverifiedFactors: false,
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

  const enrollTOTP = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      await loadMFAStatus();
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const challengeFactor = async (factorId: string) => {
    try {
      const { data, error } = await supabase.auth.mfa.challenge({ factorId });
      if (error) throw error;
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  const verifyFactor = async (factorId: string, challengeId: string, code: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
      if (error) throw error;
      await loadMFAStatus();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unenrollFactor = async (factorId: string) => {
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
  };

  const cleanupUnverifiedFactors = async () => {
    const unverified = factors.filter(f => (f as any).status === 'unverified');
    for (const f of unverified) {
      await unenrollFactor(f.id);
    }
  };

  const getPrimaryFactor = () => factors.find(f => f.status === 'verified');

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
