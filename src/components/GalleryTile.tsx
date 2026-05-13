import { useState } from 'react';

import {
  publicGalleryImageSrc,
  publicGalleryPlaceholderSrc,
} from '#/lib/public-image-urls';
import type { GalleryListItem } from '#/types/gallery';

type Props = {
  item: GalleryListItem;
  className?: string;
  /** Tighter cap for dense grids (e.g. admin). */
  variant?: 'default' | 'grid';
};

/**
 * Object-fit within viewport, blurred tiny WebP underneath to avoid CLS and improve perceived load.
 */
export function GalleryTile({
  item,
  className = '',
  variant = 'default',
}: Props) {
  const [loaded, setLoaded] = useState(false);

  const isGrid = variant === 'grid';

  if (isGrid) {
    return (
      <div
        className={`relative flex aspect-square w-full max-w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-200/80 dark:bg-neutral-800 ${className}`}
      >
        <img
          src={publicGalleryPlaceholderSrc(item.id)}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover blur-xl transition-opacity duration-300 ${loaded ? 'opacity-0' : 'opacity-100'}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          aria-hidden
        />
        <img
          src={publicGalleryImageSrc(item.id)}
          alt="Gallery image"
          width={item.width}
          height={item.height}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={`relative z-10 max-h-full max-w-full object-contain opacity-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex w-full max-w-full justify-center overflow-hidden rounded-lg bg-neutral-200/80 dark:bg-neutral-800 ${className}`}
      style={{
        aspectRatio: `${item.width} / ${item.height}`,
        maxHeight: 'min(85vh, 100vh)',
      }}
    >
      <img
        src={publicGalleryPlaceholderSrc(item.id)}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover blur-xl transition-opacity duration-300 ${loaded ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
        decoding="async"
        draggable={false}
        aria-hidden
      />
      <img
        src={publicGalleryImageSrc(item.id)}
        alt="Gallery image"
        width={item.width}
        height={item.height}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={`relative z-10 h-full w-full max-w-full object-contain opacity-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
