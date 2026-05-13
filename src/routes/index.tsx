import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, ImagePlus, UserRound } from 'lucide-react';

import { GalleryTile } from '#/components/GalleryTile';
import { UploadDialog } from '#/components/UploadDialog';
import { FLOAT_NAV_SCROLL_THRESHOLD_PX } from '#/lib/gallery-config';
import { galleryKey } from '#/routes/-gallery-keys';
import { listGalleryPage } from '#/server/gallery';
import { Button } from '@headlessui/react';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const queryClient = useQueryClient();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [navVisible, setNavVisible] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const gallery = useInfiniteQuery({
    queryKey: galleryKey,
    queryFn: async ({ pageParam }) =>
      listGalleryPage({
        data: {
          cursor: pageParam,
        },
      }),
    initialPageParam: undefined as
      | { createdAtMs: number; id: string }
      | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const items = gallery.data?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit && gallery.hasNextPage && !gallery.isFetchingNextPage) {
          void gallery.fetchNextPage();
        }
      },
      { rootMargin: '400px' },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [
    gallery.hasNextPage,
    gallery.isFetchingNextPage,
    gallery.fetchNextPage,
    items.length,
  ]);

  useEffect(() => {
    const onScroll = () => {
      setNavVisible(window.scrollY > FLOAT_NAV_SCROLL_THRESHOLD_PX);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTopAndRefresh = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: galleryKey });
    }, 400);
  }, [queryClient]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    setUploadFiles(Array.from(list));
    setUploadOpen(true);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-28 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Public gallery
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {gallery.isLoading ? (
          <p className="text-neutral-600 dark:text-neutral-400">Loading…</p>
        ) : gallery.isError ? (
          <p className="text-red-600">Could not load gallery.</p>
        ) : (
          <div className="flex flex-col gap-8">
            {items.map((item) => (
              <GalleryTile key={item.id} item={item} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-8 w-full" />

        {gallery.isFetchingNextPage ? (
          <p className="mt-4 text-center text-sm text-neutral-500">
            Loading more…
          </p>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPickFiles}
        />

        <Button
          aria-label="Upload images"
          onClick={() => fileInputRef.current?.click()}
          className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 dark:bg-neutral-100 dark:text-neutral-900"
        >
          <ImagePlus className="h-6 w-6" />
        </Button>

        <Link
          to="/profile"
          aria-label="Profile"
          className="fixed top-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <UserRound className="h-5 w-5" />
        </Link>

        <div
          className={`fixed right-6 bottom-6 z-40 transition-all duration-300 ${
            navVisible
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-2 opacity-0'
          }`}
        >
          <Button
            aria-label="Scroll to top and refresh"
            onClick={scrollTopAndRefresh}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg ring-1 ring-neutral-200 transition-transform hover:scale-105 active:scale-95 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-neutral-700"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </div>

        <UploadDialog
          open={uploadOpen}
          files={uploadFiles}
          onClose={() => setUploadOpen(false)}
          onSessionFinish={(hadSuccess) => {
            if (hadSuccess) {
              void queryClient.invalidateQueries({ queryKey: galleryKey });
            }
          }}
        />
      </main>
    </div>
  );
}
