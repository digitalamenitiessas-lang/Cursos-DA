export type YouTubePlayerApi = {
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
};
type YouTubeApi = {
  Player: new (
    target: HTMLElement,
    options: {
      host: string;
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady(event: { target: YouTubePlayerApi }): void;
        onStateChange(event: { data: number; target: YouTubePlayerApi }): void;
        onError(event: { data: number }): void;
      };
    },
  ) => YouTubePlayerApi;
};
type YouTubeWindow = Window & {
  YT?: YouTubeApi;
  onYouTubeIframeAPIReady?: () => void;
};
let apiPromise: Promise<YouTubeApi> | undefined;

export function loadYouTubeApi(): Promise<YouTubeApi> {
  const win = window as YouTubeWindow;
  if (win.YT?.Player) return Promise.resolve(win.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previous = win.onYouTubeIframeAPIReady;
    const script = document.createElement('script');
    const cleanup = () => {
      clearTimeout(timeout);
      if (win.onYouTubeIframeAPIReady === ready) win.onYouTubeIframeAPIReady = previous;
    };
    const fail = () => {
      cleanup();
      script.remove();
      apiPromise = undefined;
      reject(new Error('YouTube player unavailable'));
    };
    const ready = () => {
      cleanup();
      previous?.();
      if (win.YT?.Player) resolve(win.YT);
      else fail();
    };
    const timeout = setTimeout(fail, 20000);
    win.onYouTubeIframeAPIReady = ready;
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return apiPromise;
}
