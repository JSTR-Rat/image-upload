import { defineConfig } from 'drizzle-kit';
import fs from 'node:fs';
import path from 'node:path';

function getLocalSqliteFilePath() {
  // Find the first .sqlite file in .wrangler/state (v3|d1|...)
  // Returns a relative path from project root (best effort)

  const baseDir = path.join('.wrangler', 'state');
  if (!fs.existsSync(baseDir)) return null;

  // Recursively search for .sqlite files inside .wrangler/state/d1 or v3/d1/etc.
  function findSqliteFile(dir: string): string | null {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findSqliteFile(fullPath);
        if (found) return found;
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.sqlite') &&
        !entry.name.includes('metadata')
      ) {
        return fullPath;
      }
    }
    return null;
  }

  const sqliteFile = findSqliteFile(baseDir);
  console.log(`SQLite File: '${sqliteFile}'`);
  if (!sqliteFile) return null;
  return path.relative(process.cwd(), sqliteFile);
}

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

  // D1 credentials (loaded from environment variables)
  // For local development, wrangler handles this automatically
  // For CI/CD, set these environment variables:
  dbCredentials: {
    url: getLocalSqliteFilePath() || '',
  },

  // Verbose logging for debugging
  verbose: true,

  // Strict mode ensures type safety
  strict: true,
});
