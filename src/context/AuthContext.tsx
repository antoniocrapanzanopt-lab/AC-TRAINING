import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, Organization, OrganizationMember, UserRole } from '../types';
import { getLocalOwnerProfile } from '../lib/ownerProfile';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { hasPermission } from '../lib/permissionsMatrix';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
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
  loginWithCredentials: (email: string, password?: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  signUpAthlete: (email: string, password: string) => Promise<{ error: any }>;
  refreshAuthProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDefaultMembers = (_orgId: string): OrganizationMember[] => {
  return [];
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
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

  useEffect(() => {
    const checkUserRoleAndSet = async (sessionUser: any) => {
      if (!sessionUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      const email = sessionUser.email;
      if (!email) {
        setUser(null);
        setLoading(false);
        return;
      }

      const ownerProfile = getLocalOwnerProfile();
      const ownerEmail = ownerProfile?.email?.toLowerCase().trim();
      const currentEmail = email.toLowerCase().trim();

      // Se l'email è quella del proprietario/coach, assegna SEMPRE il ruolo 'owner' (Dashboard Coach)
      const isOwnerEmail = currentEmail === 'antonio.crapanzanopt@gmail.com' || (ownerEmail && currentEmail === ownerEmail);

      if (isOwnerEmail) {
        setUser({
          id: sessionUser.id,
          name: ownerProfile?.fullName || sessionUser.user_metadata?.full_name || email.split('@')[0] || 'Coach',
          email: email,
          role: 'owner',
          canViewFinancials: true,
        });
        setLoading(false);
        return;
      }

      // Check if the user is an athlete
      // Prima di interrogare, eseguiamo l'auto-link via RPC in modo sicuro
      // Se è la prima volta che l'atleta si logga, l'RPC collegherà il suo auth.uid al record in DB.
      await supabase.rpc('link_athlete_account');

      const { data: athleteData } = await supabase
        .from('athletes')
        .select('id, first_name, last_name, auth_user_id')
        .ilike('email', email.trim())
        .maybeSingle();

      if (athleteData) {
        setUser({
          id: sessionUser.id,
          athleteId: athleteData.id,
          name: `${athleteData.first_name} ${athleteData.last_name}`,
          email: email,
          role: 'athlete',
          canViewFinancials: false,
        });
      } else {
        // SICUREZZA: Utente autenticato ma NON riconosciuto come atleta e NON come coach.
        // Forziamo il logout per evitare che account non autorizzati accedano alla dashboard.
        console.warn('Security: utente non autorizzato, logout forzato.', email);
        await supabase.auth.signOut();
        setUser(null);
      }
      setLoading(false);
    };

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUserRoleAndSet(session?.user);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUserRoleAndSet(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshAuthProfile = useCallback(() => {
    // Legacy refresh, kept for compatibility
  }, []);

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
    const updated = members.map(m => m.id === memberId ? { ...m, status: (m.status === 'active' ? 'inactive' : 'active') as any } : m);
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

  // Non mostrare l'app finché non controlliamo la sessione
  if (loading) {
    return <div className="h-screen w-screen bg-black flex items-center justify-center text-white">Caricamento in corso...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
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
