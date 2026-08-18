/**
 * Görseli kırpmadan, doğal en-boy oranını ve kadrajını koruyarak
 * web için optimize eder (aşırı büyük boyutları sınırlar, kaliteyi korur).
 */
export async function optimizeBannerImage(
  file: File,
  maxDimension = 2048,
): Promise<File> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;
        if (!origWidth || !origHeight) {
          return resolve(file);
        }

        // Görsel zaten makul boyuttaysa dokunma
        if (origWidth <= maxDimension && origHeight <= maxDimension) {
          return resolve(file);
        }

        // En-boy oranını bozmadan orantılı küçült
        let outWidth = origWidth;
        let outHeight = origHeight;
        if (origWidth > origHeight) {
          outWidth = maxDimension;
          outHeight = Math.round((origHeight * maxDimension) / origWidth);
        } else {
          outHeight = maxDimension;
          outWidth = Math.round((origWidth * maxDimension) / origHeight);
        }

        const canvas = document.createElement('canvas');
        canvas.width = outWidth;
        canvas.height = outHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, outWidth, outHeight);

        const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const processedFile = new File([blob], file.name, {
              type: outType,
              lastModified: Date.now(),
            });
            resolve(processedFile);
          },
          outType,
          0.92
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
