import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseYouTubeVideoId,
  readVideoSource,
  youtubeVideoReference,
} from '../src/lib/media/video-source';

const videoId = 'M7lc1UVf-VE';
test('YouTube links normalize watch, share, mobile, shorts, live and embed formats', () => {
  for (const input of [
    videoId,
    ` https://www.youtube.com/watch?v=${videoId}&t=30s `,
    `https://youtube.com/watch?list=playlist&v=${videoId}`,
    `https://m.youtube.com/watch?v=${videoId}`,
    `https://music.youtube.com/watch?v=${videoId}`,
    `https://youtu.be/${videoId}?si=share-token`,
    `https://www.youtube.com/shorts/${videoId}`,
    `https://www.youtube.com/live/${videoId}`,
    `https://www.youtube.com/embed/${videoId}`,
    `https://www.youtube-nocookie.com/embed/${videoId}`,
  ])
    assert.equal(parseYouTubeVideoId(input), videoId, input);
});

test('video linking rejects HTML, scripts, playlists, spoofed hosts and malformed IDs', () => {
  for (const input of [
    '',
    'not-a-valid-video',
    'javascript:alert(1)',
    `<iframe src="https://www.youtube.com/embed/${videoId}"></iframe>`,
    `https://youtube.com.attacker.test/watch?v=${videoId}`,
    `https://youtube.com@attacker.test/watch?v=${videoId}`,
    `https://attacker.test@youtube.com/watch?v=${videoId}`,
    `https://attacker.test/watch?v=${videoId}`,
    `http://youtube.com/watch?v=${videoId}`,
    `https://youtube.com:444/watch?v=${videoId}`,
    `https://youtube.com/redirect?v=${videoId}`,
    `https://youtu.be/${videoId}/extra`,
    'https://youtube.com/playlist?list=playlist',
    'https://youtube.com/watch?v=too-short',
    'https://youtube.com/watch?v=M7lc1UVf-VEextra',
    'https://youtube.com/watch?v=%3Cscript%3E',
  ])
    assert.equal(parseYouTubeVideoId(input), null, input);
});

test('private references allow video reuse across lessons and preserve existing Stream IDs', () => {
  const first = '40000000-0000-0000-0000-000000000001';
  const second = '40000000-0000-0000-0000-000000000002';
  const reference = youtubeVideoReference(videoId, first);
  assert.notEqual(reference, youtubeVideoReference(videoId, second));
  assert.deepEqual(readVideoSource(reference, first), { provider: 'youtube', videoId });
  assert.deepEqual(readVideoSource('private-stream-id', first), {
    provider: 'cloudflare',
    uid: 'private-stream-id',
  });
  assert.throws(() => readVideoSource(reference, second));
  assert.throws(() => readVideoSource(`youtube:invalid:${first}`, first));
  assert.throws(() => readVideoSource(`${reference}:extra`, first));
});
