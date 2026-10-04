import assert from 'node:assert/strict';
import test from 'node:test';
import { loadYouTubeApi } from '../src/lib/media/youtube-player-api';

test('YouTube SDK shares loading, retries after failure and resolves only when the player API is ready', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  type Script = { src: string; async: boolean; onerror: () => void; remove: () => void };
  const scripts: Script[] = [];
  const win: {
    YT?: Awaited<ReturnType<typeof loadYouTubeApi>>;
    onYouTubeIframeAPIReady?: () => void;
  } = {};
  let removed = 0;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: win });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => ({ remove: () => removed++ }),
      head: { appendChild: (script: Script) => scripts.push(script) },
    },
  });
  try {
    const first = loadYouTubeApi();
    assert.equal(first, loadYouTubeApi());
    assert.equal(scripts.length, 1);
    const rejected = assert.rejects(first, /unavailable/);
    scripts[0].onerror();
    await rejected;
    assert.equal(removed, 1);

    const retry = loadYouTubeApi();
    assert.equal(scripts.length, 2);
    assert.equal(scripts[1].src, 'https://www.youtube.com/iframe_api');
    assert.equal(retry, loadYouTubeApi());
    let resolved = false;
    void retry.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    assert.equal(resolved, false);
    win.YT = {
      Player: class {
        getCurrentTime() {
          return 0;
        }
        getPlayerState() {
          return 0;
        }
        destroy() {}
      },
    };
    win.onYouTubeIframeAPIReady?.();
    assert.equal(await retry, win.YT);
    assert.equal(await loadYouTubeApi(), win.YT);
    assert.equal(scripts.length, 2);
  } finally {
    for (const [name, descriptor] of [
      ['window', originalWindow],
      ['document', originalDocument],
    ] as const) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
