import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, anonymous } from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

import * as schema from '#/db/schema';

import { createD1Db } from '#/db/create-db';
import { authAc, authRoles } from '#/lib/auth-access';

export type AuthEnv = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

export function createAuthInstance(env: AuthEnv) {
  const db = createD1Db(env.DB);

  return betterAuth({
    appName: 'Image Upload',
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: trustedOriginsFromEnv(env.BETTER_AUTH_URL),
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      anonymous({
        emailDomainName: 'anonymous.local',
        // Plugin deletes the anon user after link; FK cascade would wipe rows unless uploads are attributed to the signed-in user first.
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          const fromId = anonymousUser.user.id;
          const toId = newUser.user.id;
          if (!fromId || !toId || fromId === toId) return;
          await db
            .update(schema.images)
            .set({ uploaderUserId: toId })
            .where(eq(schema.images.uploaderUserId, fromId));
        },
      }),
      admin({
        ac: authAc,
        roles: authRoles,
        defaultRole: 'user',
        adminRoles: ['admin'],
      }),
      tanstackStartCookies(),
    ],
  });
}

function trustedOriginsFromEnv(baseURL: string): string[] {
  const origins = new Set<string>();
  if (baseURL && baseURL.startsWith('http')) {
    try {
      origins.add(new URL(baseURL).origin);
    } catch {
      /* ignore */
    }
  }
  origins.add('http://localhost:3000');
  origins.add('http://127.0.0.1:3000');
  return [...origins];
}
