import { Fragment, useEffect, useState } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  tone?: 'danger' | 'default';
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  tone = 'default',
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  const btnClass =
    tone === 'danger'
      ? 'bg-red-600 hover:bg-red-500 focus-visible:outline-red-600'
      : 'bg-neutral-900 hover:bg-neutral-800 focus-visible:outline-neutral-600 dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-900';

  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={busy ? () => {} : onCancel}
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
              <DialogPanel className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-xl dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50">
                <DialogTitle className="text-lg font-semibold">
                  {title}
                </DialogTitle>
                {description ? (
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {description}
                  </p>
                ) : null}

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onCancel}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-100"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        setBusy(true);
                        await onConfirm();
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-offset-2 disabled:opacity-50 ${btnClass}`}
                  >
                    {busy ? '…' : confirmLabel}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
