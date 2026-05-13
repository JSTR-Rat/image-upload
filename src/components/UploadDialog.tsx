import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { z } from 'zod';

import { convertFileToWebp } from '#/lib/client-image';
import { MAX_UPLOAD_BYTES, WEBP_QUALITY } from '#/lib/gallery-config';

const uploadResponseSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});

type Step = 'pending' | 'converting' | 'uploading' | 'done' | 'error';

type Row = {
  file: File;
  step: Step;
  error?: string;
};

type Props = {
  open: boolean;
  files: File[];
  onClose: () => void;
  /** Called once when uploads complete (success if at least one file succeeded) */
  onSessionFinish: (hadSuccess: boolean) => void;
};

export function UploadDialog({ open, files, onClose, onSessionFinish }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const runId = useRef(0);
  const onCloseRef = useRef(onClose);
  const onSessionFinishRef = useRef(onSessionFinish);
  onCloseRef.current = onClose;
  onSessionFinishRef.current = onSessionFinish;

  useEffect(() => {
    if (!open) {
      setRows([]);
      setBusy(false);
      return;
    }
    setRows(
      files.map((file) => ({
        file,
        step: 'pending' as const,
      })),
    );
  }, [open, files]);

  useEffect(() => {
    if (!open || files.length === 0) return;

    const id = ++runId.current;
    let cancelled = false;

    const run = async () => {
      setBusy(true);
      let anySuccess = false;
      let anyFailure = false;

      for (let i = 0; i < files.length; i++) {
        if (cancelled || id !== runId.current) return;
        const file = files[i];

        const patch = (ix: number, update: Partial<Row>) => {
          setRows((prev) => {
            const next = [...prev];
            if (next[ix]) next[ix] = { ...next[ix], file, ...update };
            return next;
          });
        };

        const setErr = (msg: string) => {
          anyFailure = true;
          patch(i, { step: 'error', error: msg });
        };

        patch(i, { step: 'converting' });

        try {
          if (file.size > MAX_UPLOAD_BYTES) {
            setErr('File exceeds maximum size');
            continue;
          }

          const webpBlob = await convertFileToWebp(file, WEBP_QUALITY);
          if (id !== runId.current) return;
          patch(i, { step: 'uploading' });

          const form = new FormData();
          form.set('file', webpBlob, 'upload.webp');
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: form,
            credentials: 'include',
          });
          const parsed = uploadResponseSchema.safeParse(await res.json());

          if (!res.ok || !parsed.success || !parsed.data.ok) {
            const msg =
              parsed.success && !parsed.data.ok && parsed.data.error
                ? parsed.data.error
                : 'Upload failed';
            setErr(msg);
            continue;
          }

          anySuccess = true;
          patch(i, { step: 'done' });
        } catch (err) {
          setErr(err instanceof Error ? err.message : 'Something went wrong');
        }
      }

      if (id !== runId.current) return;
      setBusy(false);
      onSessionFinishRef.current(anySuccess);

      const allSucceeded = anySuccess && !anyFailure;
      if (allSucceeded) {
        window.setTimeout(() => {
          if (id === runId.current) onCloseRef.current();
        }, 5000);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, files]);

  const retry = async (index: number) => {
    if (busy) return;
    if (index < 0 || index >= rows.length) return;
    const { file } = rows[index];

    setBusy(true);
    setRows((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { file, step: 'converting' };
      return next;
    });

    const patch = (update: Partial<Row>) => {
      setRows((prev) => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], file, ...update };
        return next;
      });
    };

    try {
      if (file.size > MAX_UPLOAD_BYTES) {
        patch({ step: 'error', error: 'File exceeds maximum size' });
        setBusy(false);
        return;
      }
      patch({ step: 'converting' });
      const webpBlob = await convertFileToWebp(file, WEBP_QUALITY);
      patch({ step: 'uploading' });
      const form = new FormData();
      form.set('file', webpBlob, 'upload.webp');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      const parsed = uploadResponseSchema.safeParse(await res.json());

      if (!res.ok || !parsed.success || !parsed.data.ok) {
        patch({
          step: 'error',
          error:
            parsed.success && !parsed.data.ok && parsed.data.error
              ? parsed.data.error
              : 'Upload failed',
        });
        setBusy(false);
        return;
      }
      patch({ step: 'done' });
      onSessionFinish(true);
      setBusy(false);
    } catch (err) {
      patch({
        step: 'error',
        error: err instanceof Error ? err.message : 'Something went wrong',
      });
      setBusy(false);
    }
  };

  const allSuccess = rows.length > 0 && rows.every((r) => r.step === 'done');

  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => {
          if (!busy) onClose();
        }}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto p-4">
          <div className="flex min-h-full items-center justify-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-950">
                <DialogTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  Upload images
                </DialogTitle>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  WebP conversion runs locally (metadata stripped). This dialog
                  cannot close while uploads are in progress.
                </p>

                <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto">
                  {rows.map((row, i) => (
                    <li
                      key={`${row.file.name}-${i}`}
                      className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {row.file.name}
                        </p>
                        {row.step === 'error' && row.error ? (
                          <p className="mt-1 text-xs text-red-600">
                            {row.error}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {row.step === 'converting' ||
                        row.step === 'uploading' ? (
                          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
                        ) : row.step === 'done' ? (
                          <Check className="h-5 w-5 text-emerald-600" />
                        ) : row.step === 'error' ? (
                          <>
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <Button
                              disabled={busy}
                              onClick={() => retry(i)}
                              className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                            >
                              Retry
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-neutral-500">
                            Pending
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {allSuccess ? (
                  <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
                    All uploads finished. Closing in a few seconds…
                  </p>
                ) : null}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
