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
import { uploaderLabelClassName } from '#/lib/uploader-label-style';
import { deleteImageFn, listAdminGalleryPage } from '#/server/gallery';

import type { AdminGalleryListItem } from '#/types/gallery';

import {
  GALLERY_PER_PAGE_OPTIONS,
  adminRouteSearchSchema,
} from '#/lib/gallery-route-search';

import { galleryKey } from '#/routes/-gallery-keys';

export const Route = createFileRoute('/admin/')({
  validateSearch: zodValidator(adminRouteSearchSchema),
  component: AdminDashboard,
});

/** Short label for the tile; full value stays in `title`. */
function shortUploaderLabel(item: AdminGalleryListItem): string {
  if (!item.uploaderIsAnonymous) {
    const n = item.uploaderName.trim();
    if (n.length <= 10) return n;
    return `${n.slice(0, 9)}…`;
  }
  const id = item.uploaderUserId;
  if (id.length <= 7) return id;
  return `${id.slice(0, 5)}…`;
}

function AdminDashboard() {
  const navigate = useNavigate({ from: '/admin/' });
  const queryClient = useQueryClient();
  const { page, perPage, uploader } = Route.useSearch();
  const { data: session, isPending } = authClient.useSession();

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const gallery = useQuery({
    queryKey: ['admin', 'gallery', page, perPage, uploader],
    queryFn: () =>
      listAdminGalleryPage({
        data: {
          page,
          pageSize: perPage,
          uploaderUserId: uploader,
        },
      }),
  });

  const items = gallery.data?.items ?? [];
  const total = gallery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (!gallery.data) return;
    const tp = Math.max(1, Math.ceil(gallery.data.total / perPage));
    if (page > tp) {
      void navigate({ search: (s) => ({ ...s, page: tp }), replace: true });
    }
  }, [gallery.data, perPage, page, navigate]);

  const setSearch = useCallback(
    (
      patch: Partial<{
        page: number;
        perPage: (typeof GALLERY_PER_PAGE_OPTIONS)[number];
        uploader: string | undefined;
      }>,
    ) => {
      void navigate({
        search: (prev) => ({ ...prev, ...patch }),
      });
    },
    [navigate],
  );

  const clearUploaderFilter = useCallback(() => {
    void navigate({
      search: (prev) => ({ ...prev, uploader: undefined, page: 1 }),
    });
  }, [navigate]);

  const afterDelete = useCallback(() => {
    void gallery.refetch();
    void queryClient.invalidateQueries({ queryKey: galleryKey });
  }, [gallery, queryClient]);

  if (isPending) {
    return (
      <div className="p-8 text-neutral-700 dark:text-neutral-200">Loading…</div>
    );
  }

  if (!session?.user || session.user.role !== 'admin') {
    void navigate({ to: '/admin/sign-in', replace: true });
    return null;
  }

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
            Admin
          </h1>
          <Button
            className="cursor-pointer text-sm text-neutral-600 hover:underline dark:text-neutral-300"
            onClick={() => {
              void authClient.signOut();
              void navigate({ to: '/', replace: true });
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-700 dark:text-neutral-200">
            Moderate uploads. Deletes require admin permissions server-side.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {uploader ? (
              <Button
                onClick={clearUploaderFilter}
                className="cursor-pointer rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                Clear uploader filter
              </Button>
            ) : null}
            <label className="flex cursor-default items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
              <span className="whitespace-nowrap">Per page</span>
              <Listbox
                value={perPage}
                onChange={(
                  value: (typeof GALLERY_PER_PAGE_OPTIONS)[number],
                ) => {
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
        </div>

        {gallery.isLoading ? (
          <p className="text-neutral-700 dark:text-neutral-200">Loading…</p>
        ) : gallery.isError ? (
          <p className="text-red-600 dark:text-red-400">
            Could not load images.
          </p>
        ) : items.length === 0 ? (
          <p className="text-neutral-700 dark:text-neutral-200">
            No images match this view.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <AdminImageCell
                key={item.id}
                item={item}
                onFilterUploader={() => {
                  void navigate({
                    search: (prev) => ({
                      ...prev,
                      uploader: item.uploaderUserId,
                      page: 1,
                    }),
                  });
                }}
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
          description="Permanently remove this image for all users."
          confirmLabel="Delete"
          tone="danger"
          onCancel={() => setConfirmId(null)}
          onConfirm={async () => {
            if (!confirmId) return;
            const r = await deleteImageFn({ data: { imageId: confirmId } });
            setConfirmId(null);
            if (r.ok) afterDelete();
          }}
        />
      </main>
    </div>
  );
}

function AdminImageCell({
  item,
  onFilterUploader,
  onDelete,
}: {
  item: AdminGalleryListItem;
  onFilterUploader: () => void;
  onDelete: () => void;
}) {
  const label = shortUploaderLabel(item);
  const labelClass = uploaderLabelClassName(
    item.uploaderIsAnonymous,
    item.uploaderUserId,
  );

  return (
    <div className="relative min-w-0">
      <Button
        onClick={(e) => {
          e.preventDefault();
          onFilterUploader();
        }}
        title={
          item.uploaderIsAnonymous
            ? `Anonymous · ${item.uploaderUserId} — click to filter`
            : `${item.uploaderName} — click to filter`
        }
        className={`pointer-events-auto absolute top-2 left-2 z-15 max-w-18 cursor-pointer rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight font-medium shadow-sm backdrop-blur-sm ${labelClass} sm:max-w-21`}
      >
        <span className="block truncate">{label}</span>
      </Button>
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
