import { Dialog, Transition } from '@headlessui/react';
import { SpinnerIcon } from './SpinnerIcon';

export const SpinnerBG = () => {
  return (
    <Transition appear show={true}>
      <Dialog open={true} className="relative z-50" onClose={console.log}>
        <div className="fixed left-0 right-0 top-0 bottom-0 backdrop-blur-sm bg-black/50 flex justify-center items-center">
          <SpinnerIcon className="size-28" />
        </div>
      </Dialog>
    </Transition>
  );
};
