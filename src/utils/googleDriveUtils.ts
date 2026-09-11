const GOOGLE_DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com']);

/** Extract a file ID from the common Google Drive sharing URL formats. */
export const getGoogleDriveFileId = (value?: string): string | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    const url = new URL(raw.match(/^https?:\/\//i) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!GOOGLE_DRIVE_HOSTS.has(host)) return null;

    const pathMatch = url.pathname.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([^/]+)/i);
    return pathMatch?.[1] || url.searchParams.get('id') || null;
  } catch {
    return null;
  }
};

/** Convert a Google Drive sharing link into a URL that can be embedded in an iframe. */
export const toGoogleDrivePreviewUrl = (value?: string): string | undefined => {
  if (!value) return value;
  const fileId = getGoogleDriveFileId(value);
  return fileId ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview` : value;
};
