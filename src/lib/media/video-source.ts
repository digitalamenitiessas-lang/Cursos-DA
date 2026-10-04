const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/;
const youtubeHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
]);
const embedHosts = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com']);

export function parseYouTubeVideoId(value: string): string | null {
  const input = value.trim();
  if (youtubeIdPattern.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    let id: string | null = null;
    if (url.hostname === 'youtu.be' || url.hostname === 'www.youtu.be') {
      id = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null;
    } else if (youtubeHosts.has(url.hostname)) {
      id =
        url.pathname === '/watch'
          ? url.searchParams.get('v')
          : (/^\/(?:embed|shorts|live)\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null);
    } else if (embedHosts.has(url.hostname)) {
      id = /^\/embed\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null;
    }
    return id && youtubeIdPattern.test(id) ? id : null;
  } catch {
    return null;
  }
}

export type VideoSource =
  { provider: 'youtube'; videoId: string } | { provider: 'cloudflare'; uid: string };

// Keep media references in the existing private table. Scoping by lesson preserves
// its unique constraint while allowing the same YouTube video in several classes.
export function youtubeVideoReference(videoId: string, lessonId: string): string {
  if (!youtubeIdPattern.test(videoId)) throw new Error('Invalid YouTube video ID');
  return `youtube:${videoId}:${lessonId}`;
}

export function readVideoSource(reference: string, lessonId: string): VideoSource {
  if (!reference.startsWith('youtube:')) return { provider: 'cloudflare', uid: reference };
  const parts = reference.split(':');
  if (parts.length !== 3 || !youtubeIdPattern.test(parts[1]) || parts[2] !== lessonId)
    throw new Error('Invalid YouTube media reference');
  return { provider: 'youtube', videoId: parts[1] };
}
