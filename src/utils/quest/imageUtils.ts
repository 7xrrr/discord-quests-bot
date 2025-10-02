export function isVideoFile(fileName: string | null | undefined): boolean {
  if (!fileName) return false;
  const videoExtensions = [".mp4", ".m3u8", ".mov", ".avi", ".webm"];
  return videoExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

export function isImageFile(fileName: string | null | undefined): boolean {
  if (!fileName) return false;
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}
