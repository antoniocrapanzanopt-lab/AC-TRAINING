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
  loginAsDemoCoach: () => void;
  loginAsDemoAthlete: () => void;
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

      // Check if the user is an athlete
      const { data: athleteData } = await supabase
        .from('athletes')
        .select('id, first_name, last_name, auth_user_id')
        .eq('email', email)
        .maybeSingle();

      if (athleteData) {
        // Se è un atleta e non ha ancora l'auth_user_id, facciamo l'auto-link
        if (!athleteData.auth_user_id) {
          await supabase
            .from('athletes')
            .update({ auth_user_id: sessionUser.id })
            .eq('id', athleteData.id);
        }

        setUser({
          id: athleteData.id,
          name: `${athleteData.first_name} ${athleteData.last_name}`,
          email: email,
          role: 'athlete',
          canViewFinancials: false,
        });
      } else {
        setUser({
          id: sessionUser.id,
          name: sessionUser.user_metadata?.full_name || email.split('@')[0] || 'User',
          email: email,
          role: 'owner',
          canViewFinancials: true,
        });
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

  const loginAsDemoCoach = () => {
    setUser({
      id: 'demo-local',
      name: 'Coach Demo',
      email: 'coach@demo.local',
      role: 'owner',
      canViewFinancials: true,
    });
  };

  const loginAsDemoAthlete = () => {
    setUser({
      id: 'demo-local',
      name: 'Atleta Demo',
      email: 'atleta@demo.local',
      role: 'athlete',
      canViewFinancials: false,
    });
  };

  const loginWithCredentials = async (email: string, password?: string) => {
    if (!password) password = "password123"; // Fallback safety
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signUpAthlete = async (email: string, password: string) => {
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
        loginAsDemoCoach,
        loginAsDemoAthlete,
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
