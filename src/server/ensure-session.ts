import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { auth } from '#/lib/auth';

export type SessionBootstrap = {
  userId: string;
  role: string | null;
  isAnonymous: boolean;
};

/**
 * Ensures a Better Auth session: creates an anonymous user on first visit.
 * Call from root `beforeLoad` so SSR blocks render until cookies can be set (via tanstackStartCookies).
 */
export const ensureSessionFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionBootstrap> => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      const signed = await auth.api.signInAnonymous({
        headers: request.headers,
      });
      return {
        userId: signed.user.id,
        role: signed.user.role ?? null,
        isAnonymous: Boolean(
          (signed.user as { isAnonymous?: boolean }).isAnonymous,
        ),
      };
    }
    return {
      userId: session.user.id,
      role: session.user.role ?? null,
      isAnonymous: Boolean(
        (session.user as { isAnonymous?: boolean }).isAnonymous,
      ),
    };
  },
);
