import { env } from 'cloudflare:workers';

import { createAuthInstance } from './auth-factory';

export const auth = createAuthInstance({
  DB: env.DB,
  BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: env.BETTER_AUTH_URL,
});
