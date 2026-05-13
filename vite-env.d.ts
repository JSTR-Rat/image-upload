/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public CDN base (no trailing slash). Staging/production in `.env.*`; omit locally for `/api/media`. */
  readonly VITE_PUBLIC_IMAGE_CDN_ORIGIN?: string;
}

