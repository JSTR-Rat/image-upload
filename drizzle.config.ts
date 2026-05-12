import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit Configuration for Cloudflare D1
 *
 * This config is used by drizzle-kit for:
 * - Generating migrations from schema changes
 * - Managing database migrations
 * - Introspecting the database
 *
 * For D1, migrations are applied by Cloudflare Workers, not by drizzle-kit directly.
 * The migrations_dir must match what's in wrangler.jsonc.
 */
export default defineConfig({
  // Schema location
  schema: './src/db/schema',

  // Output directory for migrations
  // This MUST match migrations_dir in wrangler.jsonc
  out: './drizzle',

  // Database dialect
  dialect: 'sqlite',

  // Driver configuration for D1
  driver: 'd1-http',

  // D1 credentials (loaded from environment variables)
  // For local development, wrangler handles this automatically
  // For CI/CD, set these environment variables:
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },

  // Verbose logging for debugging
  verbose: true,

  // Strict mode ensures type safety
  strict: true,
});
