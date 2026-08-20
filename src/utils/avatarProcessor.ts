/**
 * Utility to process uploaded avatar images.
 * Automatically crops to a square, resizes, compresses, and converts to WebP.
 */
export const processAvatarImage = (file: File, targetSize = 120, quality = 0.5): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          // Calculate square crop dimensions (center crop)
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          // Set canvas size to square
          canvas.width = targetSize;
          canvas.height = targetSize;

          // Draw the cropped and resized image onto the canvas
          ctx.drawImage(
            img,
            sx,
            sy,
            minDim,
            minDim, // Source crop
            0,
            0,
            targetSize,
            targetSize // Destination
          );

          // Convert to WebP format with specified compression quality
          let dataUrl = canvas.toDataURL("image/webp", quality);
          
          // Fallback if browser doesn't support webp conversion
          if (!dataUrl.startsWith("data:image/webp")) {
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }

          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image into element"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

/**
 * priority-based avatar selection
 * 1. Custom Avatar URL (if exists)
 * 2. Google Avatar URL (if exists)
 * 3. Default System Avatar
 */
export const getAvatarPriority = (
  customAvatarUrl?: string | null,
  googleAvatarUrl?: string | null,
  gender?: string | null
): string => {
  if (customAvatarUrl && customAvatarUrl.trim() !== "") {
    return customAvatarUrl;
  }
  if (googleAvatarUrl && googleAvatarUrl.trim() !== "") {
    return googleAvatarUrl;
  }
  
  // Default system avatar based on gender if available, otherwise general default
  const defaultMale = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f1f5f9'/><circle cx='50' cy='38' r='20' fill='%2364748b'/><path d='M22 85c0-14 11-22 28-22s28 8 28 22z' fill='%2364748b'/></svg>";
  const defaultFemale = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23fdf2f8'/><circle cx='50' cy='38' r='20' fill='%23ec4899'/><path d='M22 85c0-14 11-22 28-22s28 8 28 22z' fill='%23ec4899'/></svg>";
  
  if (gender === "Nữ") {
    return defaultFemale;
  }
  return defaultMale;
};
