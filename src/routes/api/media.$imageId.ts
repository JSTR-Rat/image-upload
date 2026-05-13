import { createFileRoute } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';

import { db } from '#/db';
import { images } from '#/db/schema/app';

export const Route = createFileRoute('/api/media/$imageId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const placeholder = url.searchParams.get('placeholder') === '1';

        const rowsDb = await db
          .select({
            r2KeyFull: images.r2KeyFull,
            r2KeyPlaceholder: images.r2KeyPlaceholder,
            deletedAt: images.deletedAt,
          })
          .from(images)
          .where(eq(images.id, params.imageId))
          .limit(1);

        if (rowsDb.length === 0) {
          return new Response('Not found', { status: 404 });
        }
        const rowDb = rowsDb[0];
        if (rowDb.deletedAt != null) {
          return new Response('Not found', { status: 404 });
        }

        const key = placeholder ? rowDb.r2KeyPlaceholder : rowDb.r2KeyFull;

        const { env } = await import('cloudflare:workers');
        const obj = await env.CDN_BUCKET.get(key);
        if (!obj) {
          return new Response('Missing object', { status: 404 });
        }

        const headers = new Headers();
        headers.set('Content-Type', 'image/webp');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new Response(obj.body, { headers });
      },
    },
  },
});
