/**
 * Parse Google Drive file share / view URLs and build an embeddable preview URL.
 * The file must be shared so anyone with the link can view (or at least the students' accounts).
 */
export function extractGoogleDriveFileId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (!u.hostname.includes("google.com")) return null;
    const pathMatch = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (pathMatch?.[1]) return pathMatch[1];
    const idParam = u.searchParams.get("id");
    if (idParam) return idParam;
    return null;
  } catch {
    return null;
  }
}

export function toGoogleDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function isValidGoogleDriveVideoUrl(url: string): boolean {
  return !!extractGoogleDriveFileId(url);
}

export function normalizeGoogleDriveEmbedUrl(url: string): string | null {
  const id = extractGoogleDriveFileId(url);
  if (!id) return null;
  return toGoogleDrivePreviewUrl(id);
}
