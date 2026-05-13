import {
  adminClient,
  anonymousClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { authAc, authRoles } from '#/lib/auth-access';

export const authClient = createAuthClient({
  baseURL:
    typeof window !== 'undefined' ? window.location.origin : undefined,
  plugins: [
    anonymousClient(),
    adminClient({
      ac: authAc,
      roles: authRoles,
    }),
  ],
});
