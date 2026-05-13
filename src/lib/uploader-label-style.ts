/** Not in `ANONYMOUS_UPLOADER_LABEL_COMBOS`; used for every registered (non-anonymous) uploader. */
export const REGISTERED_UPLOADER_LABEL_CLASSES =
  'border-2 border-amber-500 bg-gradient-to-b from-amber-50 to-amber-100/90 text-neutral-900 shadow-sm dark:border-amber-400 dark:from-amber-950/90 dark:to-amber-900/70 dark:text-amber-50 dark:shadow-amber-900/40';

/**
 * Ten anonymous-only accent combos (bg + border + text). Hash by user id so each anonymous
 * account is stable and spread across buckets.
 */
export const ANONYMOUS_UPLOADER_LABEL_COMBOS: readonly { className: string }[] = [
  {
    className:
      'border border-rose-400 bg-rose-100 text-rose-950 dark:border-rose-500 dark:bg-rose-950/55 dark:text-rose-50',
  },
  {
    className:
      'border border-sky-400 bg-sky-100 text-sky-950 dark:border-sky-500 dark:bg-sky-950/55 dark:text-sky-50',
  },
  {
    className:
      'border border-emerald-400 bg-emerald-100 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/55 dark:text-emerald-50',
  },
  {
    className:
      'border border-violet-400 bg-violet-100 text-violet-950 dark:border-violet-500 dark:bg-violet-950/55 dark:text-violet-50',
  },
  {
    className:
      'border border-orange-400 bg-orange-100 text-orange-950 dark:border-orange-500 dark:bg-orange-950/55 dark:text-orange-50',
  },
  {
    className:
      'border border-teal-400 bg-teal-100 text-teal-950 dark:border-teal-500 dark:bg-teal-950/55 dark:text-teal-50',
  },
  {
    className:
      'border border-fuchsia-400 bg-fuchsia-100 text-fuchsia-950 dark:border-fuchsia-500 dark:bg-fuchsia-950/55 dark:text-fuchsia-50',
  },
  {
    className:
      'border border-indigo-400 bg-indigo-100 text-indigo-950 dark:border-indigo-500 dark:bg-indigo-950/55 dark:text-indigo-50',
  },
  {
    className:
      'border border-lime-500 bg-lime-100 text-lime-950 dark:border-lime-500 dark:bg-lime-950/50 dark:text-lime-50',
  },
  {
    className:
      'border border-cyan-400 bg-cyan-100 text-cyan-950 dark:border-cyan-500 dark:bg-cyan-950/55 dark:text-cyan-50',
  },
];

function hashToBucket(input: string, buckets: number): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i);
  }
  return Math.abs(h) % buckets;
}

/** Class string for a small pill label (registered users share one look; anonymous uses hashed combo). */
export function uploaderLabelClassName(
  isAnonymous: boolean,
  anonymousSeedUserId: string,
): string {
  if (!isAnonymous) return REGISTERED_UPLOADER_LABEL_CLASSES;
  const i = hashToBucket(
    anonymousSeedUserId,
    ANONYMOUS_UPLOADER_LABEL_COMBOS.length,
  );
  return ANONYMOUS_UPLOADER_LABEL_COMBOS[i].className;
}
