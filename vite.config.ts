import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';

import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

const isVitest = process.env.VITEST === 'true';

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    // Vitest 4 injects Node builtins (including `node:node:*` specifiers) into
    // resolve.external; the Cloudflare plugin rejects that Worker environment.
    !isVitest && cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ].filter((plugin) => plugin !== false),
});

export default config;
