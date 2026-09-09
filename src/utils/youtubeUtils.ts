const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{6,}$/;

/** Return the video ID from common YouTube URL formats. */
export function getYouTubeVideoId(value?: string): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (YOUTUBE_ID_PATTERN.test(raw)) return raw;

  try {
    const url = new URL(raw.match(/^https?:\/\//i) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0]?.match(YOUTUBE_ID_PATTERN)?.[0] || null;
    if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'youtube-nocookie.com') return null;
    if (url.pathname === '/watch') return url.searchParams.get('v')?.match(YOUTUBE_ID_PATTERN)?.[0] || null;
    const segment = url.pathname.split('/').filter(Boolean);
    if (['embed', 'shorts', 'live', 'v'].includes(segment[0] || '')) return segment[1]?.match(YOUTUBE_ID_PATTERN)?.[0] || null;
  } catch {
    return null;
  }
  return null;
}

/** Convert a YouTube link into an embeddable URL instead of framing /watch. */
export function toYouTubeEmbedUrl(value?: string): string | null {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : null;
}
