import { authRoles } from '#/lib/auth-access';

const permissionOptions = {
  defaultRole: 'user' as const,
  adminRoles: ['admin'] as const,
  roles: authRoles,
};

type PermissionInput = {
  role: string | null | undefined;
  permissions: Record<string, string[]>;
};

/** Mirrors Better Auth admin `hasPermission` (see `better-auth` admin plugin) for our custom `image` resource. */
function hasImagePermission(input: PermissionInput): boolean {
  const roles = (input.role || permissionOptions.defaultRole).split(',');
  const acRoles = permissionOptions.roles;
  for (const r of roles) {
    if (r !== 'admin' && r !== 'user') continue;
    const roleObj = acRoles[r];
    if (roleObj.authorize(input.permissions).success) return true;
  }
  return false;
}

export function canDeleteGalleryImage(input: {
  userId: string;
  role: string | null | undefined;
  imageUploaderUserId: string;
}): boolean {
  const own = input.userId === input.imageUploaderUserId;
  return hasImagePermission({
    role: input.role,
    permissions: own
      ? { image: ['delete-own'] }
      : { image: ['delete-any'] },
  });
}

export { permissionOptions };
