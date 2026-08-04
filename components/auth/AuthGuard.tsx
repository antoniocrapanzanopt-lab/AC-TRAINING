import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuthPage } from '../../pages/auth/AuthPage';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  // Controllo presenza utente o sessione
  if (!isAuthenticated && !user) {
    return <AuthPage />;
  }

  return <>{children}</>;
};
