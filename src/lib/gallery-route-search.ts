import { fallback } from '@tanstack/zod-adapter';
import { z } from 'zod';

/** Allowed `perPage` values for profile and admin gallery URLs. */
export const GALLERY_PER_PAGE_OPTIONS = [10, 20, 30, 50] as const;

export type GalleryPerPage = (typeof GALLERY_PER_PAGE_OPTIONS)[number];

function parsePerPage(n: number): GalleryPerPage {
  if (
    Number.isFinite(n) &&
    (GALLERY_PER_PAGE_OPTIONS as readonly number[]).includes(n)
  ) {
    return n as GalleryPerPage;
  }
  return 20;
}

const pageSearchField = z.optional(
  fallback(z.coerce.number().int().min(1), 1),
);

const perPageSearchField = z.optional(
  fallback(z.coerce.number().transform(parsePerPage), 20),
);

function normalizeGallerySearch(raw: {
  page?: number;
  perPage?: number;
}): { page: number; perPage: GalleryPerPage } {
  return {
    page: raw.page ?? 1,
    perPage: parsePerPage(raw.perPage ?? 20),
  };
}

/** `/profile` — `?page` & `?perPage` (defaults: 1, 20). */
export const profileRouteSearchSchema = z
  .object({
    page: pageSearchField,
    perPage: perPageSearchField,
  })
  .transform(normalizeGallerySearch);

/** `/admin/` — pagination plus optional `?uploader=<user id>`. */
export const adminRouteSearchSchema = z
  .object({
    page: pageSearchField,
    perPage: perPageSearchField,
    uploader: z.optional(z.string()),
  })
  .transform((raw) => ({
    ...normalizeGallerySearch(raw),
    uploader:
      raw.uploader !== undefined && raw.uploader.trim().length > 0
        ? raw.uploader.trim()
        : undefined,
  }));

export type ProfileRouteSearch = z.infer<typeof profileRouteSearchSchema>;
export type AdminRouteSearch = z.infer<typeof adminRouteSearchSchema>;
