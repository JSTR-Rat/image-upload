/**
 * Create an email/password admin user for a Wrangler environment (local D1 proxy, or remote D1 for staging/production).
 *
 * Usage:
 *   pnpm create-admin
 *   pnpm create-admin -- --env=staging
 *   pnpm create-admin -- --env=production
 */
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { eq } from 'drizzle-orm';
import { getPlatformProxy } from 'wrangler';

import { user } from '#/db/schema/auth';
import { createAuthInstance } from '#/lib/auth-factory';
import { createD1Db } from '#/db/create-db';

type EnvName = 'local' | 'staging' | 'production';

function parseEnv(argv: string[]): EnvName {
  const raw = argv.find((a) => a.startsWith('--env='))?.slice('--env='.length);
  const v = (raw || 'local').toLowerCase();
  if (v === 'local' || v === 'staging' || v === 'production') return v;
  throw new Error(`Invalid --env (use local, staging, or production)`);
}

async function main() {
  const envName = parseEnv(process.argv.slice(2));

  const rl = readline.createInterface({ input, output });
  const name = await rl.question('Name: ');
  const email = await rl.question('Email: ');
  const password = await rl.question('Password: ');
  await rl.close();

  if (!email.includes('@')) {
    console.error('Invalid email.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const proxy = await getPlatformProxy({
    environment: envName === 'local' ? undefined : envName,
    configPath: 'wrangler.jsonc',
  });

  try {
    const env = proxy.env as unknown as Env;
    const auth = createAuthInstance({
      DB: env.DB,
      BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: env.BETTER_AUTH_URL,
    });

    const base = new URL(env.BETTER_AUTH_URL);
    const signUpUrl = new URL('/api/auth/sign-up/email', base);

    const res = await auth.handler(
      new Request(signUpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      }),
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('Sign-up failed:', res.status, text);
      process.exit(1);
    }

    const db = createD1Db(env.DB);
    await db
      .update(user)
      .set({
        role: 'admin',
        isAnonymous: false,
      })
      .where(eq(user.email, email));

    console.log(`Admin user created or updated for ${email}.`);
  } finally {
    await proxy.dispose();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
