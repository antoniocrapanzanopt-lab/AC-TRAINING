import { MFAState, UserRole } from '../types';

export type AuthScreenState = 'LOADING' | 'LOGIN' | 'SETUP_REQUIRED' | 'CHALLENGE_REQUIRED' | 'ALLOWED';

/**
 * Pure function to determine the correct MFA and Auth Screen State.
 * Handles race conditions, loading states, and factor checks.
 */
export const resolveMFAAccessState = (
  sessionUser: any,
  mfaState: MFAState,
  role: UserRole
): AuthScreenState => {
  // 1. Nessuna sessione
  if (!sessionUser) return 'LOGIN';

  // 2. MFA in caricamento per prevenire race conditions o UI sfarfallanti
  if (mfaState.isLoading) return 'LOADING';

  const mfaRequired = role === 'owner' || role === 'admin';

  // 3. Controllo sessione corrente e fallback
  const isAal1 = mfaState.currentAAL === 'aal1' || mfaState.currentAAL === null;

  // 4. Utente con factor verificati
  if (mfaState.hasVerifiedFactors) {
    return isAal1 ? 'CHALLENGE_REQUIRED' : 'ALLOWED';
  }

  // 5. Utente senza factor verificati (ma MFA obbligatoria per ruolo)
  if (mfaRequired) {
    return 'SETUP_REQUIRED';
  }

  // 6. Utente normale senza factor verificati
  return 'ALLOWED';
};
