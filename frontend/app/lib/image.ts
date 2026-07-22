/**
 * Downscale an image file to a compact JPEG data URL in the browser, before it
 * ever reaches the server. Ashram admins upload straight from a phone camera
 * (several MB); a daily darshan only needs to look good on a phone screen, so
 * we cap the longest edge and re-encode as JPEG.
 */
export async function fileToDownscaledDataUrl(
  file: File,
  maxEdge = 1280,
  quality = 0.8
): Promise<string> {
  const bitmap = await loadBitmap(file);

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

/** Prefer createImageBitmap; fall back to an <img> for older browsers. */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image"));
    };
    img.src = url;
  });
}
