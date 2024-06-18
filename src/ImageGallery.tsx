import { useState, useEffect, useCallback, DragEventHandler } from 'react';
import { FileUploader } from './FileUploader';
import { useMutation } from '@tanstack/react-query';
import { SpinnerBG } from './SpinnerBG';

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

const fetchImages = async (token: string | null) => {
  const response = await fetch(
    'https://7mo5lqvxn8.execute-api.ap-southeast-2.amazonaws.com/Dev/list',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        continuationToken: token,
      }),
    }
  );

  const data = await response.json();
  return data;
};

const ImageGallery = () => {
  const [images, setImages] = useState<{ Key: string }[]>([]);
  const [continuationToken, setContinuationToken] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      await Promise.all(files.map(uploadToS3));
    },
  });

  const loadMoreImages = useCallback(async () => {
    setLoading(true);
    const data = await fetchImages(continuationToken);

    if (data.objects) {
      const dataObjects = data.objects as { Key: string }[];
      setImages((prevImages) => {
        // Ensure no duplicate keys
        const newImages = dataObjects.filter(
          (newImage) =>
            !prevImages.some(
              (existingImage) => existingImage.Key === newImage.Key
            )
        );
        return [...prevImages, ...newImages];
      });
    }

    setContinuationToken(data.nextContinuationToken);
    setLoading(false);
  }, [continuationToken]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      await uploadMutation.mutateAsync(files);
    },
    [uploadMutation]
  );

  const handleFileDrop: DragEventHandler<HTMLDivElement> = useCallback(
    async (ev) => {
      ev.preventDefault();
      console.log(ev);
      if (ev.dataTransfer && ev.dataTransfer.files.length > 0) {
        await uploadFiles([...ev.dataTransfer.files]);
      }
    },
    [uploadFiles]
  );

  const handleDragOver: DragEventHandler<HTMLDivElement> = useCallback((ev) => {
    ev.preventDefault();
  }, []);

  useEffect(() => {
    loadMoreImages();
  }, []);

  return (
    <div
      className="w-full min-h-dvh"
      onDragOver={handleDragOver}
      onDrop={handleFileDrop}
    >
      <FileUploader onSelect={uploadFiles} />
      <div className="snap-proximity snap-y w-full min-h-svh h-svh max-h-svh overflow-y-scroll">
        {images.map((image) => (
          <img
            key={image.Key}
            className="object-contain w-full max-w-full max-h-full mx-auto snap-always snap-center"
            src={`https://censor-studio.s3.ap-southeast-2.amazonaws.com/${image.Key}`}
            alt={image.Key}
          />
        ))}
        <div className="w-full h-56 snap-always snap-center">
          {continuationToken && !loading && (
            <button onClick={loadMoreImages}>Load More</button>
          )}
          {loading && <p>Loading...</p>}
          {!continuationToken && !loading && <p>No more images</p>}
        </div>
      </div>
      {uploadMutation.isPending && <SpinnerBG />}
    </div>
  );
};

export default ImageGallery;
