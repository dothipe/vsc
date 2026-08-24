/**
 * Unified high-efficiency image compression utility for VSC Vietnam Slingshot app.
 * Ensures 100% online cloud storage compliance by compressing all uploaded images
 * (avatars, logos, banners, sponsors) to minimal byte sizes (typically 2KB - 25KB)
 * while preserving high visual quality on Retina and mobile screens.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  squareCrop?: boolean;
  quality?: number; // 0.1 to 1.0
  format?: "image/webp" | "image/jpeg";
}

/**
 * Universal image compression function accepting File, Blob, or base64 DataURL.
 */
export async function compressImage(
  input: File | Blob | string,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 400,
    maxHeight = 400,
    squareCrop = false,
    quality = 0.55,
    format = "image/webp"
  } = options;

  let dataUrl: string;
  if (typeof input === "string") {
    dataUrl = input;
  } else {
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Lỗi đọc tệp ảnh"));
      reader.readAsDataURL(input);
    });
  }

  // If already a tiny SVG, return directly
  if (dataUrl.startsWith("data:image/svg+xml") && dataUrl.length < 5000) {
    return dataUrl;
  }

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: false });
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        let sx = 0;
        let sy = 0;
        let sWidth = img.width;
        let sHeight = img.height;
        let dWidth = img.width;
        let dHeight = img.height;

        if (squareCrop) {
          // Center square crop
          const minDim = Math.min(img.width, img.height);
          sx = (img.width - minDim) / 2;
          sy = (img.height - minDim) / 2;
          sWidth = minDim;
          sHeight = minDim;

          const targetDim = Math.min(maxWidth, maxHeight, minDim);
          dWidth = targetDim;
          dHeight = targetDim;
        } else {
          // Aspect-ratio preserving scale down
          if (dWidth > maxWidth) {
            dHeight = Math.round((dHeight * maxWidth) / dWidth);
            dWidth = maxWidth;
          }
          if (dHeight > maxHeight) {
            dWidth = Math.round((dWidth * maxHeight) / dHeight);
            dHeight = maxHeight;
          }
        }

        canvas.width = Math.max(1, dWidth);
        canvas.height = Math.max(1, dHeight);

        // Fill white background for transparent PNG/WebP conversions to avoid black artifacts if converted to JPEG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image onto canvas
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

        // Attempt WebP export first for maximum compression efficiency
        let compressed = canvas.toDataURL(format, quality);
        
        // Fallback to JPEG if WebP unsupported or empty
        if (!compressed || (!compressed.startsWith("data:image/webp") && format === "image/webp")) {
          compressed = canvas.toDataURL("image/jpeg", quality);
        }

        // If compressed image is still slightly large, do a secondary pass
        if (compressed.length > 50000 && (dWidth > 200 || dHeight > 200)) {
          const secondCanvas = document.createElement("canvas");
          const secondCtx = secondCanvas.getContext("2d");
          if (secondCtx) {
            secondCanvas.width = Math.round(canvas.width * 0.75);
            secondCanvas.height = Math.round(canvas.height * 0.75);
            secondCtx.fillStyle = "#ffffff";
            secondCtx.fillRect(0, 0, secondCanvas.width, secondCanvas.height);
            secondCtx.drawImage(canvas, 0, 0, secondCanvas.width, secondCanvas.height);
            const secondPass = secondCanvas.toDataURL(format, quality * 0.9);
            if (secondPass && secondPass.length < compressed.length) {
              compressed = secondPass;
            }
          }
        }

        resolve(compressed);
      } catch (err) {
        console.warn("Canvas image compression fallback:", err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      console.warn("Image load error during compression");
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

/**
 * Compress Avatar Image: Square crop, 110x110 px, ~3KB - 6KB.
 */
export async function compressAvatar(input: File | Blob | string): Promise<string> {
  return compressImage(input, {
    maxWidth: 110,
    maxHeight: 110,
    squareCrop: true,
    quality: 0.55,
    format: "image/webp"
  });
}

/**
 * Compress Logo Image (Tournament, Club, Sponsor): Max 160x160 px, ~5KB - 10KB.
 */
export async function compressLogo(input: File | Blob | string): Promise<string> {
  return compressImage(input, {
    maxWidth: 160,
    maxHeight: 160,
    squareCrop: false,
    quality: 0.55,
    format: "image/webp"
  });
}

/**
 * Compress Banner Image (Tournament, Club): Max 600x240 px, ~12KB - 22KB.
 */
export async function compressBanner(input: File | Blob | string): Promise<string> {
  return compressImage(input, {
    maxWidth: 600,
    maxHeight: 240,
    squareCrop: false,
    quality: 0.55,
    format: "image/webp"
  });
}
