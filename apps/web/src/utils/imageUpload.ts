const MAX_DIMENSION = 400; // px, longer side
const JPEG_QUALITY = 0.85;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB -- generous headroom before the canvas resize

/**
 * Reads an image file and returns it as a resized JPEG data URL, suitable for storing
 * directly as `photoUrl`. Downscaling client-side matters here because contact photos are
 * embedded inline in every `/api/contacts` list response (there's no separate file storage) --
 * an unprocessed multi-MB camera photo would bloat every fetch of the contact list.
 */
export function readImageAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Please choose an image file."));
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Promise.reject(new Error("That image is too large -- please choose one under 8MB."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't read that image."));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Couldn't process that image."));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
