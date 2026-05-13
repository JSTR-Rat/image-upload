import { r2FullKey, r2PlaceholderKey } from '#/lib/r2-keys';

/**
 * Browser-visible CDN origin (Vite `--mode`; set in `.env.staging` / `.env.production`).
 * Omit or leave empty in `.env.development` to load via Worker `/api/media`.
 */
function cdnOriginFromEnv(): string {
  const raw = import.meta.env.VITE_PUBLIC_IMAGE_CDN_ORIGIN;
  if (typeof raw !== 'string' || raw.trim().length === 0) return '';
  return raw.trim().replace(/\/$/, '');
}

/** Fully resolved `<img src>` for full-size gallery WebP (`img/<id>/full.webp`). */
export function publicGalleryImageSrc(imageId: string): string {
  const origin = cdnOriginFromEnv();
  if (!origin.length) return `/api/media/${imageId}`;
  return `${origin}/${r2FullKey(imageId)}`;
}

/** Resolved `<img src>` for blurred placeholder (`img/<id>/placeholder.webp`). */
export function publicGalleryPlaceholderSrc(imageId: string): string {
  const origin = cdnOriginFromEnv();
  if (!origin.length)
    return `/api/media/${imageId}?placeholder=1`;
  return `${origin}/${r2PlaceholderKey(imageId)}`;
}
