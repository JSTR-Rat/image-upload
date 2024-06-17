import { ChangeEventHandler, FC, useCallback, useRef } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/20/solid';
import { Button } from '@headlessui/react';

type Props = {
  onSelect: (files: File[]) => void;
};

export const FileUploader: FC<Props> = (props) => {
  const { onSelect } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const files = event.target.files;
      if (files !== null && files.length > 0) {
        onSelect?.([...files]);
        // Handle the selected file here (e.g., upload to server)
      }
    },
    [onSelect]
  );

  return (
    <div>
      <Button
        className="fixed top-0 right-0 m-2 p-2 bg-black bg-opacity-20 rounded-lg"
        onClick={handleClick}
      >
        <ArrowUpTrayIcon className="size-8 fill-white" />
      </Button>
      <input
        type="file"
        multiple={true}
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
};
