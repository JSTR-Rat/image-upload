import { disableTypes, imageSize } from 'image-size';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { and, count, desc, eq, isNull, lt, or } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '#/db';
import { images } from '#/db/schema/app';
import { user } from '#/db/schema/auth';
import { auth } from '#/lib/auth';
import { GALLERY_PAGE_SIZE } from '#/lib/gallery-config';
import { canDeleteGalleryImage } from '#/lib/permissions';

import type { AdminGalleryListItem, GalleryListItem } from '#/types/gallery';

disableTypes(['icns', 'heif', 'jxl']);

const galleryListInput = z.object({
  cursor: z
    .object({
      createdAtMs: z.number(),
      id: z.string(),
    })
    .optional(),
});

const adminListInput = z.object({
  page: z.number().int().min(1),
  pageSize: z.union([
    z.literal(10),
    z.literal(20),
    z.literal(30),
    z.literal(50),
  ]),
  uploaderUserId: z.string().min(1).optional(),
});

export const listAdminGalleryPage = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => adminListInput.parse(raw))
  .handler(
    async ({
      data,
    }): Promise<{
      items: AdminGalleryListItem[];
      total: number;
    }> => {
      const request = getRequest();
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user || session.user.role !== 'admin') {
        throw new Error('Forbidden');
      }

      const { page, pageSize, uploaderUserId } = data;
      const offset = (page - 1) * pageSize;

      const whereFilter = uploaderUserId
        ? and(
            isNull(images.deletedAt),
            eq(images.uploaderUserId, uploaderUserId),
          )
        : isNull(images.deletedAt);

      const [countRow] = await db
        .select({ n: count() })
        .from(images)
        .where(whereFilter);

      const total = Number(countRow.n);

      const rows = await db
        .select({
          id: images.id,
          width: images.width,
          height: images.height,
          createdAt: images.createdAt,
          uploaderUserId: images.uploaderUserId,
          uploaderName: user.name,
          uploaderIsAnonymous: user.isAnonymous,
        })
        .from(images)
        .innerJoin(user, eq(images.uploaderUserId, user.id))
        .where(whereFilter)
        .orderBy(desc(images.createdAt), desc(images.id))
        .limit(pageSize)
        .offset(offset);

      return {
        total,
        items: rows.map((r) => ({
          id: r.id,
          width: r.width,
          height: r.height,
          createdAtMs: r.createdAt.getTime(),
          uploaderUserId: r.uploaderUserId,
          uploaderName: r.uploaderName,
          uploaderIsAnonymous: Boolean(r.uploaderIsAnonymous),
        })),
      };
    },
  );

export const listGalleryPage = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => galleryListInput.parse(raw))
  .handler(
    async ({
      data,
    }): Promise<{
      items: GalleryListItem[];
      nextCursor: { createdAtMs: number; id: string } | null;
    }> => {
      const limit = GALLERY_PAGE_SIZE + 1;
      const cursor = data.cursor;

      const where = cursor
        ? and(
            isNull(images.deletedAt),
            or(
              lt(images.createdAt, new Date(cursor.createdAtMs)),
              and(
                eq(images.createdAt, new Date(cursor.createdAtMs)),
                lt(images.id, cursor.id),
              ),
            ),
          )
        : isNull(images.deletedAt);

      const rows = await db
        .select({
          id: images.id,
          width: images.width,
          height: images.height,
          createdAt: images.createdAt,
        })
        .from(images)
        .where(where)
        .orderBy(desc(images.createdAt), desc(images.id))
        .limit(limit);

      const hasMore = rows.length > GALLERY_PAGE_SIZE;
      const slice = hasMore ? rows.slice(0, GALLERY_PAGE_SIZE) : rows;
      const last = slice.at(-1);

      return {
        items: slice.map((r) => ({
          id: r.id,
          width: r.width,
          height: r.height,
          createdAtMs: r.createdAt.getTime(),
        })),
        nextCursor:
          hasMore && last
            ? { createdAtMs: last.createdAt.getTime(), id: last.id }
            : null,
      };
    },
  );

const myImagesPageInput = z.object({
  page: z.number().int().min(1),
  pageSize: z.union([
    z.literal(10),
    z.literal(20),
    z.literal(30),
    z.literal(50),
  ]),
});

export const listMyImagesPage = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => myImagesPageInput.parse(raw))
  .handler(
    async ({
      data,
    }): Promise<{
      items: GalleryListItem[];
      total: number;
    }> => {
      const request = getRequest();
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) throw new Error('Not signed in');

      const { page, pageSize } = data;
      const offset = (page - 1) * pageSize;

      const whereMine = and(
        isNull(images.deletedAt),
        eq(images.uploaderUserId, session.user.id),
      );

      const [countRow] = await db
        .select({ n: count() })
        .from(images)
        .where(whereMine);

      const total = Number(countRow.n);

      const rows = await db
        .select({
          id: images.id,
          width: images.width,
          height: images.height,
          createdAt: images.createdAt,
        })
        .from(images)
        .where(whereMine)
        .orderBy(desc(images.createdAt), desc(images.id))
        .limit(pageSize)
        .offset(offset);

      return {
        total,
        items: rows.map((r) => ({
          id: r.id,
          width: r.width,
          height: r.height,
          createdAtMs: r.createdAt.getTime(),
        })),
      };
    },
  );

const deleteInput = z.object({ imageId: z.string().min(1) });

export const deleteImageFn = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => deleteInput.parse(raw))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return { ok: false, error: 'Not signed in' };

    const found = await db
      .select({
        uploaderUserId: images.uploaderUserId,
        r2KeyFull: images.r2KeyFull,
        r2KeyPlaceholder: images.r2KeyPlaceholder,
        deletedAt: images.deletedAt,
      })
      .from(images)
      .where(eq(images.id, data.imageId))
      .limit(1);

    if (found.length === 0) return { ok: false, error: 'Not found' };
    const row = found[0];
    if (row.deletedAt != null) {
      return { ok: false, error: 'Not found' };
    }

    const role = session.user.role ?? null;
    if (
      !canDeleteGalleryImage({
        userId: session.user.id,
        role,
        imageUploaderUserId: row.uploaderUserId,
      })
    ) {
      return { ok: false, error: 'Forbidden' };
    }

    const { env } = await import('cloudflare:workers');

    await db
      .update(images)
      .set({ deletedAt: new Date() })
      .where(eq(images.id, data.imageId));

    await env.CDN_BUCKET.delete(row.r2KeyFull);
    await env.CDN_BUCKET.delete(row.r2KeyPlaceholder);

    return { ok: true };
  });

export function dimensionsFromWebpBuffer(buf: Uint8Array): {
  width: number;
  height: number;
} {
  const r = imageSize(buf);
  if (!r.width || !r.height)
    throw new Error('Could not read image dimensions');
  return { width: r.width, height: r.height };
}
