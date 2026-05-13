/**
 * Multipart upload endpoint (avoids large base64 payloads in JSON server functions).
 */
import { createFileRoute } from '@tanstack/react-router';

import { db } from '#/db';
import { images } from '#/db/schema/app';
import { auth } from '#/lib/auth';
import { MAX_UPLOAD_BYTES } from '#/lib/gallery-config';
import { getPlaceholderWebpOrFallback } from '#/lib/photon-placeholder';
import { newImageRecordId, r2FullKey, r2PlaceholderKey } from '#/lib/r2-keys';
import { dimensionsFromWebpBuffer } from '#/server/gallery';
import { isWebpMagic } from '#/lib/webp';

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json(
            { ok: false as const, error: 'Unauthorized' },
            { status: 401 },
          );
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json(
            { ok: false as const, error: 'Invalid form data' },
            { status: 400 },
          );
        }

        const file = form.get('file');
        if (!(file instanceof File)) {
          return Response.json(
            { ok: false as const, error: 'Expected file field' },
            { status: 400 },
          );
        }

        if (file.size > MAX_UPLOAD_BYTES) {
          return Response.json(
            { ok: false as const, error: 'File too large' },
            { status: 413 },
          );
        }

        if (file.type !== 'image/webp') {
          return Response.json(
            { ok: false as const, error: 'Unsupported media type' },
            { status: 415 },
          );
        }

        const buffer = new Uint8Array(await file.arrayBuffer());
        if (!isWebpMagic(buffer)) {
          return Response.json(
            { ok: false as const, error: 'Content is not WebP' },
            { status: 415 },
          );
        }

        let width: number;
        let height: number;
        try {
          const d = dimensionsFromWebpBuffer(buffer);
          width = d.width;
          height = d.height;
        } catch {
          return Response.json(
            { ok: false as const, error: 'Invalid image data' },
            { status: 422 },
          );
        }

        const placeholderBytes = await getPlaceholderWebpOrFallback(buffer);

        const id = newImageRecordId();
        const fullKey = r2FullKey(id);
        const phKey = r2PlaceholderKey(id);

        const { env } = await import('cloudflare:workers');

        await env.CDN_BUCKET.put(fullKey, buffer, {
          httpMetadata: { contentType: 'image/webp' },
        });
        await env.CDN_BUCKET.put(phKey, placeholderBytes, {
          httpMetadata: { contentType: 'image/webp' },
        });

        try {
          await db.insert(images).values({
            id,
            uploaderUserId: session.user.id,
            r2KeyFull: fullKey,
            r2KeyPlaceholder: phKey,
            width,
            height,
            fileSize: buffer.byteLength,
            mimeType: 'image/webp',
          });
        } catch (err) {
          await env.CDN_BUCKET.delete(fullKey).catch(() => undefined);
          await env.CDN_BUCKET.delete(phKey).catch(() => undefined);
          const message = err instanceof Error ? err.message : 'Insert failed';
          return Response.json(
            { ok: false as const, error: message },
            { status: 500 },
          );
        }

        return Response.json({
          ok: true as const,
          image: {
            id,
            width,
            height,
            createdAtMs: Date.now(),
          },
        });
      },
    },
  },
});
