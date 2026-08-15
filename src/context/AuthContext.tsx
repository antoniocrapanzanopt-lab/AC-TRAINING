import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { UserProfile, Organization, OrganizationMember, UserRole } from '../types';
import { getLocalOwnerProfile } from '../lib/ownerProfile';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { hasPermission } from '../lib/permissionsMatrix';
import { supabase } from '../lib/supabase';
import { useMFA } from '../hooks/useMFA';
import { resolveMFAAccessState, AuthScreenState } from '../lib/mfaEngine';

export interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  authScreenState: AuthScreenState;
  mfa: ReturnType<typeof useMFA>;
  canViewFinancials: boolean;
  currentOrganization: Organization;
  members: OrganizationMember[];
  simulatedRole: UserRole;
  switchSimulatedRole: (role: UserRole) => void;
  addMember: (data: Omit<OrganizationMember, 'id' | 'organizationId'>) => OrganizationMember;
  updateMemberRole: (memberId: string, role: UserRole) => void;
  toggleFinancialVisibility: (memberId: string) => void;
  toggleMemberStatus: (memberId: string) => void;
  transferOwnership: (newOwnerMemberId: string) => boolean;
  loginAsOwner: () => void;
  loginWithCredentials: (email: string, password?: string) => Promise<{ error: Error | AuthError | null }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  signUpAthlete: (email: string, password: string) => Promise<{ error: Error | AuthError | null }>;
  refreshAuthProfile: () => Promise<void>;
  markDisclaimerAsSeen: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDefaultMembers = (_orgId: string): OrganizationMember[] => {
  return [];
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const mfa = useMFA();
  const [loading, setLoading] = useState(true);
  const [ownerProfile] = useState(() => getLocalOwnerProfile());
  const [simulatedRole, setSimulatedRole] = useState<UserRole>('owner');

  const currentOrganization: Organization = {
    id: 'org-demo-01',
    name: ownerProfile?.organizationName || 'Builder Athlete Manager Demo',
    code: 'DEMO-ORG-2026',
    createdAt: ownerProfile?.createdAt || new Date().toISOString(),
  };

  const [members, setMembers] = useState<OrganizationMember[]>(() => {
    return getStorageItem<OrganizationMember[]>('builder_athlete_members', getDefaultMembers(currentOrganization.id));
  });

  const persistMembers = useCallback((updated: OrganizationMember[]) => {
    setMembers(updated);
    setStorageItem('builder_athlete_members', updated);
  }, []);

  const checkUserRoleAndSet = useCallback(async (sessionUserArg: User | null | undefined) => {
    if (!sessionUserArg) {
      setUser(null);
      setSessionUser(null);
      setLoading(false);
      return;
    }
    setSessionUser(sessionUserArg);
    
    const email = sessionUserArg.email;
    if (!email) {
      setUser(null);
      setLoading(false);
      return;
    }

    const localSeen = localStorage.getItem(`builder_athlete_disclaimer_seen_${sessionUserArg.id}`) === 'true';
    const metadataSeen = Boolean(sessionUserArg.user_metadata?.has_seen_disclaimer);

    const owner = getLocalOwnerProfile();
    const ownerEmail = owner?.email?.toLowerCase().trim();
    const currentEmail = email.toLowerCase().trim();

    // Se l'email è quella del proprietario/coach, assegna SEMPRE il ruolo 'owner' (Dashboard Coach)
    const isOwnerEmail = currentEmail === 'antonio.crapanzanopt@gmail.com' || (ownerEmail && currentEmail === ownerEmail);

    if (isOwnerEmail) {
      setUser({
        id: sessionUserArg.id,
        name: owner?.fullName || sessionUserArg.user_metadata?.full_name || email.split('@')[0] || 'Coach',
        email: email,
        role: 'owner',
        canViewFinancials: true,
        hasSeenDisclaimer: localSeen || metadataSeen,
      });
      setLoading(false);
      return;
    }

    // Check if the user is an athlete
    await supabase.rpc('link_athlete_account');

    const { data: athleteData } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, auth_user_id')
      .ilike('email', email.trim())
      .maybeSingle();

    if (athleteData) {
      setUser({
        id: sessionUserArg.id,
        athleteId: athleteData.id,
        name: `${athleteData.first_name} ${athleteData.last_name}`,
        email: email,
        role: 'athlete',
        canViewFinancials: false,
        hasSeenDisclaimer: localSeen || metadataSeen,
      });
    } else {
      console.warn('Security: utente non autorizzato, logout forzato.', email);
      await supabase.auth.signOut();
      setUser(null);
      setSessionUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUserRoleAndSet(session?.user);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      await checkUserRoleAndSet(session?.user);
      if (event !== 'SIGNED_OUT') {
        await mfa.loadMFAStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, [checkUserRoleAndSet, mfa.loadMFAStatus]);

  const markDisclaimerAsSeen = useCallback(async () => {
    if (!user) return;

    // Aggiornamento immediato dello stato locale in React
    setUser(prev => prev ? { ...prev, hasSeenDisclaimer: true } : null);

    // 1. Salva in localStorage per rendering istantaneo privo di ritardi di rete
    try {
      localStorage.setItem(`builder_athlete_disclaimer_seen_${user.id}`, 'true');
    } catch (e) {
      console.warn('localStorage non disponibile:', e);
    }

    // 2. Salva nei metadata dell'utente Supabase Auth (persistente sul cloud)
    try {
      await supabase.auth.updateUser({
        data: { has_seen_disclaimer: true },
      });
    } catch (e) {
      console.warn('Errore aggiornamento metadata utente Supabase:', e);
    }

    // 3. Salva nella tabella del DB Supabase (athletes per il profilo atleta)
    try {
      if (user.role === 'athlete' && user.athleteId) {
        await supabase.from('athletes').update({ has_seen_disclaimer: true } as Record<string, unknown>).eq('id', user.athleteId);
      }
    } catch {
      // Fallback se la colonna non è ancora stata creata sul DB via SQL
    }
  }, [user]);

  const refreshAuthProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await checkUserRoleAndSet(session.user);
      }
      await mfa.loadMFAStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore nel refresh del profilo auth';
      console.error('Errore durante refreshAuthProfile:', msg);
    }
  }, [checkUserRoleAndSet, mfa.loadMFAStatus]);

  const switchSimulatedRole = useCallback((role: UserRole) => {
    setSimulatedRole(role);
  }, []);

  const addMember = useCallback((data: Omit<OrganizationMember, 'id' | 'organizationId'>): OrganizationMember => {
    const newMember: OrganizationMember = {
      ...data,
      id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      organizationId: currentOrganization.id,
    };
    const updated = [...members, newMember];
    persistMembers(updated);
    return newMember;
  }, [members, currentOrganization.id, persistMembers]);

  const updateMemberRole = useCallback((memberId: string, role: UserRole) => {
    const updated = members.map(m => m.id === memberId ? { ...m, role } : m);
    persistMembers(updated);
  }, [members, persistMembers]);

  const toggleFinancialVisibility = useCallback((memberId: string) => {
    const updated = members.map(m => m.id === memberId ? { ...m, canViewFinancials: !m.canViewFinancials } : m);
    persistMembers(updated);
  }, [members, persistMembers]);

  const toggleMemberStatus = useCallback((memberId: string) => {
    const updated = members.map(m => m.id === memberId ? { ...m, status: (m.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive' } : m);
    persistMembers(updated);
  }, [members, persistMembers]);

  const transferOwnership = useCallback((_newOwnerMemberId: string): boolean => {
    return false; // Disabled for now in cloud version until fully refactored
  }, []);

  const loginAsOwner = () => {
    // Deprecated in real cloud version
  };

  const loginWithCredentials = async (email: string, password?: string) => {
    if (!password) return { error: new Error('Password obbligatoria') };
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpAthlete = async (email: string, password: string) => {
    // SICUREZZA: Whitelist check via RPC (bypassa le RLS in modo sicuro solo per controllo booleano)
    // Impedisce registrazioni non autorizzate.
    const { data: isEmailAllowed, error: rpcError } = await supabase
      .rpc('check_invite_email', { email_to_check: email.trim() });

    if (rpcError || !isEmailAllowed) {
      return { error: new Error('Email non autorizzata. Contatta il tuo coach.') };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Email di reset inviata. Controlla la tua casella.' };
  };

  const activeCanViewFinancials = hasPermission(
    simulatedRole,
    'viewFinancials',
    user?.role === 'owner' ? true : !!user?.canViewFinancials
  );

  const authScreenState = useMemo(() => {
    return resolveMFAAccessState(sessionUser, mfa.mfaState, user?.role || 'athlete');
  }, [user, sessionUser, mfa.mfaState]);

  // Non mostrare l'app finché non controlliamo la sessione
  if (loading) {
    return <div className="h-screen w-screen bg-black flex items-center justify-center text-white">Caricamento in corso...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        authScreenState,
        mfa,
        canViewFinancials: activeCanViewFinancials,
        currentOrganization,
        members,
        simulatedRole,
        switchSimulatedRole,
        addMember,
        updateMemberRole,
        toggleFinancialVisibility,
        toggleMemberStatus,
        transferOwnership,
        loginAsOwner,
        loginWithCredentials,
        signUpAthlete,
        logout,
        requestPasswordReset,
        refreshAuthProfile,
        markDisclaimerAsSeen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere utilizzato all\'interno di un AuthProvider');
  }
  return context;
};
