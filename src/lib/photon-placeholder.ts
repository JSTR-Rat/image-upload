/**
 * Server-side LQIP-style placeholders using Photon WASM (Cloudflare Workers–compatible).
 * Cloudflare Images could offload variants and resizing, but this project uses R2 only;
 * Photon keeps everything self-contained without a separate Images subscription.
 */
import init, {
  PhotonImage,
  SamplingFilter,
  gaussian_blur,
  resize,
} from '@silvia-odwyer/photon';

const PLACEHOLDER_MAX_WIDTH = 40;

let wasmReady: Promise<unknown> | null = null;

function ensureWasm(): Promise<unknown> {
  wasmReady ??= init();
  return wasmReady;
}

/** Tiny blurred WebP derived from the uploaded full image (same aspect ratio). */
export async function derivePlaceholderWebp(
  sourceWebp: Uint8Array,
): Promise<Uint8Array> {
  await ensureWasm();
  const decoded = PhotonImage.new_from_byteslice(sourceWebp);
  try {
    const w = decoded.get_width();
    const h = decoded.get_height();
    const targetW = Math.min(PLACEHOLDER_MAX_WIDTH, w);
    const targetH = Math.max(1, Math.round((h * targetW) / w));
    const small = resize(
      decoded,
      targetW,
      targetH,
      SamplingFilter.Lanczos3,
    );
    try {
      gaussian_blur(small, 1.5);
      return small.get_bytes_webp();
    } finally {
      small.free();
    }
  } finally {
    decoded.free();
  }
}

/**
 * Minimal valid 1×1 neutral WebP (~46 bytes). Used when Photon/WASM cannot run in
 * the Worker bundle (common with `import.meta.url` wasm resolution in Cloudflare)
 * or when decode/resample fails for a particular file.
 * The gallery still uses DB `width`/`height` for layout; this is only the blurred under-layer.
 */
function staticNeutralPlaceholderWebp(): Uint8Array {
  const b64 =
    'UklGRiIAAABXRUJQVlA4ICAAAAAwAQCdASoCAAIAEwA0JaACdLoAA/V7tQAAAA==';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Prefer Photon LQIP; on any failure return a tiny static WebP so uploads never fail. */
export async function getPlaceholderWebpOrFallback(
  sourceWebp: Uint8Array,
): Promise<Uint8Array> {
  try {
    return await derivePlaceholderWebp(sourceWebp);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[placeholder]', msg);
    return staticNeutralPlaceholderWebp();
  }
}
