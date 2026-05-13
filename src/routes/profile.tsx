import { useCallback, useEffect, useState } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react';
import { ChevronDown, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

import { ConfirmDialog } from '#/components/ConfirmDialog';
import { GalleryTile } from '#/components/GalleryTile';
import { authClient } from '#/lib/auth-client';
import { deleteImageFn, listMyImagesPage } from '#/server/gallery';

import type { GalleryListItem } from '#/types/gallery';

import {
  GALLERY_PER_PAGE_OPTIONS,
  profileRouteSearchSchema,
} from '#/lib/gallery-route-search';

import { galleryKey } from '#/routes/-gallery-keys';

export const Route = createFileRoute('/profile')({
  validateSearch: zodValidator(profileRouteSearchSchema),
  component: Profile,
});

function ProfileImageCell({
  item,
  onDelete,
}: {
  item: GalleryListItem;
  onDelete: () => void;
}) {
  return (
    <div className="relative min-w-0">
      <GalleryTile item={item} variant="grid" />
      <Button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-2 right-2 z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/95 text-red-600 shadow-md ring-1 ring-neutral-200 hover:bg-white dark:bg-neutral-900/95 dark:text-red-400 dark:ring-neutral-700"
        aria-label="Delete image"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function Profile() {
  const navigate = useNavigate({ from: '/profile' });
  const queryClient = useQueryClient();
  const { page, perPage } = Route.useSearch();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const { data: session } = authClient.useSession();

  const isAdmin = session != null && session.user.role === 'admin';

  const q = useQuery({
    queryKey: ['gallery', 'mine', page, perPage],
    queryFn: () =>
      listMyImagesPage({
        data: { page, pageSize: perPage },
      }),
  });

  const items = q.data?.items ?? [];
  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (!q.data) return;
    const tp = Math.max(1, Math.ceil(q.data.total / perPage));
    if (page > tp) {
      void navigate({ search: (s) => ({ ...s, page: tp }), replace: true });
    }
  }, [q.data, perPage, page, navigate]);

  const setSearch = useCallback(
    (
      patch: Partial<{
        page: number;
        perPage: (typeof GALLERY_PER_PAGE_OPTIONS)[number];
      }>,
    ) => {
      void navigate({
        search: (prev) => ({ ...prev, ...patch }),
      });
    },
    [navigate],
  );

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['gallery', 'mine'] });
    void queryClient.invalidateQueries({ queryKey: galleryKey });
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            to="/"
            className="cursor-pointer text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Gallery
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Your uploads
          </h1>
          {isAdmin ? (
            <Link
              to="/admin"
              className="cursor-pointer text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Admin
            </Link>
          ) : (
            <span className="inline-block min-w-11" aria-hidden />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          <label className="flex cursor-default items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
            <span className="whitespace-nowrap">Per page</span>
            <Listbox
              value={perPage}
              onChange={(value: (typeof GALLERY_PER_PAGE_OPTIONS)[number]) => {
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    perPage: value,
                    page: 1,
                  }),
                });
              }}
            >
              <div className="relative">
                <ListboxButton className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-neutral-300 bg-white py-1.5 pr-2 pl-3 text-left text-sm text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800">
                  {perPage}
                  <ChevronDown className="size-4 opacity-60" aria-hidden />
                </ListboxButton>
                <ListboxOptions
                  anchor="bottom end"
                  className="z-50 mt-1 min-w-18 rounded-md border border-neutral-200 bg-white py-1 shadow-lg [--anchor-gap:4px] dark:border-neutral-600 dark:bg-neutral-900"
                >
                  {GALLERY_PER_PAGE_OPTIONS.map((n) => (
                    <ListboxOption
                      key={n}
                      value={n}
                      className="cursor-pointer px-3 py-1.5 text-sm text-neutral-800 data-focus:bg-neutral-100 dark:text-neutral-100 dark:data-focus:bg-neutral-800"
                    >
                      {n}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </div>
            </Listbox>
          </label>
        </div>

        {q.isLoading ? (
          <p className="text-neutral-700 dark:text-neutral-200">Loading…</p>
        ) : q.isError ? (
          <p className="text-red-600 dark:text-red-400">
            Could not load your images.
          </p>
        ) : items.length === 0 ? (
          <p className="text-neutral-700 dark:text-neutral-200">
            No uploads yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <ProfileImageCell
                key={item.id}
                item={item}
                onDelete={() => setConfirmId(item.id)}
              />
            ))}
          </div>
        )}

        {total > 0 ? (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <p className="text-sm text-neutral-700 dark:text-neutral-200">
              Page {safePage} of {totalPages} · {total} image
              {total === 1 ? '' : 's'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                disabled={safePage <= 1}
                onClick={() => setSearch({ page: safePage - 1 })}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <Button
                disabled={safePage >= totalPages}
                onClick={() => setSearch({ page: safePage + 1 })}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        <ConfirmDialog
          open={confirmId !== null}
          title="Delete image?"
          description="This removes the image from the gallery and storage."
          confirmLabel="Delete"
          tone="danger"
          onCancel={() => setConfirmId(null)}
          onConfirm={async () => {
            if (!confirmId) return;
            const r = await deleteImageFn({ data: { imageId: confirmId } });
            setConfirmId(null);
            if (r.ok) {
              void q.refetch();
              invalidate();
            }
          }}
        />
      </main>
    </div>
  );
}
