import { useState, useEffect, useCallback, DragEventHandler } from 'react';
import { FileUploader } from './FileUploader';

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
      await Promise.all(files.map(uploadToS3));
      await new Promise((res) => setTimeout(res, 2000));
      loadMoreImages();
    },
    [loadMoreImages]
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
      <div id="image-container" className="snap-proximity snap-both">
        {images.map((image) => (
          <div
            key={image.Key}
            className="bg-no-repeat bg-center bg-contain min-h-vh w-full snap-center pointer-events-none"
            style={{
              backgroundImage: `url(https://censor-studio.s3.ap-southeast-2.amazonaws.com/${image.Key})`,
            }}
          />
          // <img
          //   key={image.Key}
          //   src={`https://censor-studio.s3.ap-southeast-2.amazonaws.com/${image.Key}`}
          //   alt={image.Key}
          // />
        ))}
      </div>
      {continuationToken && !loading && (
        <button onClick={loadMoreImages}>Load More</button>
      )}
      {loading && <p>Loading...</p>}
      {!continuationToken && !loading && <p>No more images</p>}
    </div>
  );
};

export default ImageGallery;
