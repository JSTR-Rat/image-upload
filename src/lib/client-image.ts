/**
 * Convert an image file to WebP via canvas (strips EXIF / metadata).
 */
export async function convertFileToWebp(
  file: File,
  quality: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unsupported');
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        'image/webp',
        quality,
      );
    });
    if (!blob) throw new Error('WebP encoding failed');
    return blob;
  } finally {
    bitmap.close();
  }
}
