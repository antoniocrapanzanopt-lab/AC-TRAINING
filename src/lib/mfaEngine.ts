import { User } from '@supabase/supabase-js';
import { MFAState, UserRole } from '../types';

export type AuthScreenState = 'LOADING' | 'LOGIN' | 'SETUP_REQUIRED' | 'CHALLENGE_REQUIRED' | 'ALLOWED';

/**
 * Pure function to determine the correct MFA and Auth Screen State.
 * Handles race conditions, loading states, and factor checks.
 *
 * Regola prodotto:
 *  - MFA obbligatoria: SOLO owner e admin
 *  - coach, receptionist, collaborator, athlete: NESSUN obbligo MFA
 */
export const resolveMFAAccessState = (
  sessionUser: User | null | undefined,
  mfaState: MFAState,
  role: UserRole
): AuthScreenState => {
  // 1. Nessuna sessione
  if (!sessionUser) return 'LOGIN';

  // 2. MFA richiesta solo per owner e admin (NON per coach)
  const mfaRequired = role === 'owner' || role === 'admin';

  // 3. Ruoli non obbligati all'MFA (coach, athlete, receptionist, collaborator, ecc.)
  if (!mfaRequired) {
    // Se ha fattori MFA registrati e verificati ma è su aal1, chiedi la challenge
    if (mfaState.hasVerifiedFactors) {
      const isAal1 = mfaState.currentAAL === 'aal1' || mfaState.currentAAL === null;
      return isAal1 ? 'CHALLENGE_REQUIRED' : 'ALLOWED';
    }
    return 'ALLOWED';
  }

  // 4. Ruoli con MFA obbligatoria (owner, admin)
  //    Se i dati MFA non sono ancora stati caricati, aspetta sempre
  if (mfaState.isLoading) return 'LOADING';

  const isAal1 = mfaState.currentAAL === 'aal1' || mfaState.currentAAL === null;

  if (mfaState.hasVerifiedFactors) {
    return isAal1 ? 'CHALLENGE_REQUIRED' : 'ALLOWED';
  }

  // Nessun fattore MFA verificato e ruolo richiede MFA: blocca su setup
  return 'SETUP_REQUIRED';
};
