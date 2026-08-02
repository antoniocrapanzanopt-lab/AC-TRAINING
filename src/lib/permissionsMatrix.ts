import { UserRole } from '../types';

export type SystemCapability =
  | 'viewFinancials'
  | 'manageAthletes'
  | 'manageSubscriptions'
  | 'managePayments'
  | 'manageTasks'
  | 'manageCalendar'
  | 'manageDocuments'
  | 'manageCommunications'
  | 'managePackages'
  | 'editSettings'
  | 'manageCollaborators'
  | 'transferOwnership';

export interface RolePermissionConfig {
  role: UserRole;
  roleLabel: string;
  description: string;
  capabilities: Record<SystemCapability, boolean>;
}

export const PERMISSIONS_MATRIX: Record<UserRole, RolePermissionConfig> = {
  owner: {
    role: 'owner',
    roleLabel: 'Proprietario',
    description: 'Accesso totale ed ilimitato a tutti i moduli, impostazioni e gestione proprietà.',
    capabilities: {
      viewFinancials: true,
      manageAthletes: true,
      manageSubscriptions: true,
      managePayments: true,
      manageTasks: true,
      manageCalendar: true,
      manageDocuments: true,
      manageCommunications: true,
      managePackages: true,
      editSettings: true,
      manageCollaborators: true,
      transferOwnership: true,
    },
  },
  admin: {
    role: 'admin',
    roleLabel: 'Amministratore',
    description: 'Gestione completa operativa, finanziaria ed organizzativa (tranne trasferimento proprietà).',
    capabilities: {
      viewFinancials: true,
      manageAthletes: true,
      manageSubscriptions: true,
      managePayments: true,
      manageTasks: true,
      manageCalendar: true,
      manageDocuments: true,
      manageCommunications: true,
      managePackages: true,
      editSettings: true,
      manageCollaborators: true,
      transferOwnership: false,
    },
  },
  coach: {
    role: 'coach',
    roleLabel: 'Coach / Trainer',
    description: 'Gestione atleti assegnati, schede, check-in, attività e calendario appuntamenti.',
    capabilities: {
      viewFinancials: false,
      manageAthletes: true,
      manageSubscriptions: false,
      managePayments: false,
      manageTasks: true,
      manageCalendar: true,
      manageDocuments: true,
      manageCommunications: true,
      managePackages: false,
      editSettings: false,
      manageCollaborators: false,
      transferOwnership: false,
    },
  },
  receptionist: {
    role: 'receptionist',
    roleLabel: 'Segreteria / Front-Desk',
    description: 'Accoglienza, iscrizioni, incassi pratiche, scadenze, promemoria ed appuntamenti.',
    capabilities: {
      viewFinancials: false, // Di default disabilitato, attivabile dal proprietario
      manageAthletes: true,
      manageSubscriptions: true,
      managePayments: true,
      manageTasks: true,
      manageCalendar: true,
      manageDocuments: true,
      manageCommunications: true,
      managePackages: false,
      editSettings: false,
      manageCollaborators: false,
      transferOwnership: false,
    },
  },
  collaborator: {
    role: 'collaborator',
    roleLabel: 'Collaboratore',
    description: 'Assistente di sala o collaboratore esterno con permessi limitati di supporto.',
    capabilities: {
      viewFinancials: false,
      manageAthletes: true,
      manageSubscriptions: false,
      managePayments: false,
      manageTasks: true,
      manageCalendar: true,
      manageDocuments: false,
      manageCommunications: false,
      managePackages: false,
      editSettings: false,
      manageCollaborators: false,
      transferOwnership: false,
    },
  },
  athlete: {
    role: 'athlete',
    roleLabel: 'Atleta (Portale Riservato)',
    description: 'Accesso al portale riservato per visualizzare abbonamenti, scheda e scadenze personali.',
    capabilities: {
      viewFinancials: false,
      manageAthletes: false,
      manageSubscriptions: false,
      managePayments: false,
      manageTasks: false,
      manageCalendar: false,
      manageDocuments: false,
      manageCommunications: false,
      managePackages: false,
      editSettings: false,
      manageCollaborators: false,
      transferOwnership: false,
    },
  },
};

/**
 * Verifica se un determinato ruolo possiede la capacità/permesso richiesto.
 * Se per il ruoli tipo 'receptionist' o 'coach' la visibilità finanziaria è stata abilitata specificamente, usa l'override.
 */
export const hasPermission = (
  role: UserRole,
  capability: SystemCapability,
  customFinancialsOverride?: boolean
): boolean => {
  if (capability === 'viewFinancials' && customFinancialsOverride !== undefined) {
    return customFinancialsOverride;
  }
  const config = PERMISSIONS_MATRIX[role] || PERMISSIONS_MATRIX.collaborator;
  return config.capabilities[capability] ?? false;
};
