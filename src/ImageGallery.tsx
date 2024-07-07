import { useCallback, DragEventHandler } from 'react';
import { FileUploader } from './FileUploader';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SpinnerBG } from './SpinnerBG';
import { SpinnerIcon } from './SpinnerIcon';
import { useImagesInfiniteQuery } from './queries/ImagesInfiniteQuery';
import { ArrowDownCircleIcon } from '@heroicons/react/20/solid';
import { Button } from '@headlessui/react';

const uploadToS3 = async (file: File) => {
  try {
    // Fetch the presigned URL from your API Gateway
    const response = await fetch(
      'https://7mo5lqvxn8.execute-api.ap-southeast-2.amazonaws.com/Dev/upload',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: file.name,
          contentType: file.type,
        }),
      }
    );

    const { presignedUrl } = await response.json();

    // Upload the file to S3 using the presigned URL
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (uploadResponse.ok) {
      console.log('Upload successful');
    } else {
      console.error('Error uploading file:', uploadResponse.statusText);
    }
  } catch (error) {
    console.error('Error uploading file:', error);
  }
};

const ImageGallery = () => {
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      await Promise.all(files.map(uploadToS3));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
  });

  const imagesQuery = useImagesInfiniteQuery();

  const handleFileDrop: DragEventHandler<HTMLDivElement> = useCallback(
    async (ev) => {
      ev.preventDefault();
      console.log(ev);
      if (ev.dataTransfer && ev.dataTransfer.files.length > 0) {
        await uploadMutation.mutateAsync([...ev.dataTransfer.files]);
      }
    },
    [uploadMutation]
  );

  const handleDragOver: DragEventHandler<HTMLDivElement> = useCallback((ev) => {
    ev.preventDefault();
  }, []);

  const loadMoreImages = useCallback(() => {
    imagesQuery.fetchNextPage();
  }, [imagesQuery]);

  return (
    <div
      className="w-full min-h-dvh"
      onDragOver={handleDragOver}
      onDrop={handleFileDrop}
    >
      <FileUploader onSelect={uploadMutation.mutateAsync} />
      <div className="w-full min-h-svh h-svh max-h-svh overflow-y-scroll">
        {imagesQuery.data?.pages.map((page) =>
          page.images.map((image) => (
            <a key={image} href={`#${image}`} onClick={(e) => e.stopPropagation()}>
              <img
                id={image}
                className="object-contain w-full max-w-full max-h-full mx-auto"
                src={`https://censor-studio.s3.ap-southeast-2.amazonaws.com/${image}`}
                alt={image}
              />
            </a>
          ))
        )}
        <div className="w-full h-56">
          {imagesQuery.hasNextPage && !imagesQuery.isFetching && (
            <Button
              onClick={loadMoreImages}
              className="w-full h-full flex justify-center items-center"
            >
              <ArrowDownCircleIcon className="size-20" />
            </Button>
          )}
          {imagesQuery.isFetching && (
            <div className="w-full h-full flex justify-center items-center">
              <SpinnerIcon className="size-20" />
            </div>
          )}
          {!imagesQuery.hasNextPage && !imagesQuery.isFetching && (
            <p>No more images</p>
          )}
        </div>
      </div>
      {uploadMutation.isPending && <SpinnerBG />}
    </div>
  );
};

export default ImageGallery;
