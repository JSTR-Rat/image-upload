import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/admin/access';

/**
 * Extended admin access control: gallery image deletion permissions.
 * Use hasPermission from the admin plugin on the server (see src/lib/permissions.ts).
 */
export const imageStatements = {
  image: ['delete-own', 'delete-any'],
};

export const authStatements = {
  ...defaultStatements,
  ...imageStatements,
};

export const authAc = createAccessControl(authStatements);

export const authRoles = {
  admin: authAc.newRole({
    user: [
      'create',
      'list',
      'set-role',
      'ban',
      'impersonate',
      'delete',
      'set-password',
      'get',
      'update',
    ],
    session: ['list', 'revoke', 'delete'],
    image: ['delete-own', 'delete-any'],
  }),
  user: authAc.newRole({
    user: [],
    session: [],
    image: ['delete-own'],
  }),
};

export type AppRole = keyof typeof authRoles;
