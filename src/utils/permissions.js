export const PERMISSIONS = {
  owner: {
    canViewProject: true,
    canEditProject: true,
    canDeleteProject: true,
    canManageMembers: true,
    canChangeRoles: true,
    canCreatePages: true,
    canEditPages: true,
    canDeletePages: true,
    canCreateCards: true,
    canEditCards: true,
    canDeleteCards: true,
    canManageSettings: true
  },
  admin: {
    canViewProject: true,
    canEditProject: true,
    canDeleteProject: false,
    canManageMembers: true,
    canChangeRoles: false,
    canCreatePages: true,
    canEditPages: true,
    canDeletePages: true,
    canCreateCards: true,
    canEditCards: true,
    canDeleteCards: true,
    canManageSettings: true
  },
  editor: {
    canViewProject: true,
    canEditProject: false,
    canDeleteProject: false,
    canManageMembers: false,
    canChangeRoles: false,
    canCreatePages: true,
    canEditPages: true,
    canDeletePages: false,
    canCreateCards: true,
    canEditCards: true,
    canDeleteCards: false,
    canManageSettings: false
  },
  viewer: {
    canViewProject: true,
    canEditProject: false,
    canDeleteProject: false,
    canManageMembers: false,
    canChangeRoles: false,
    canCreatePages: false,
    canEditPages: false,
    canDeletePages: false,
    canCreateCards: false,
    canEditCards: false,
    canDeleteCards: false,
    canManageSettings: false
  }
};

export function hasPermission(role, action) {
  if (!role) return false;
  return PERMISSIONS[role]?.[action] || false;
}