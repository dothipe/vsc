import { compressAvatar } from "./imageCompressor";

/**
 * Utility to process uploaded avatar images.
 * Automatically crops to a square, resizes, compresses, and converts to WebP.
 */
export const processAvatarImage = async (file: File | string, targetSize = 110, quality = 0.55): Promise<string> => {
  return compressAvatar(file);
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
