import assert from 'node:assert/strict';
import test from 'node:test';
import { coverContentType, coverFileError, coverFileLimit } from '../src/lib/media/cover';

test('course covers accept Storage image formats including AVIF and missing browser MIME types', () => {
  for (const [name, type] of [
    ['cover.jpg', 'image/jpeg'],
    ['cover.png', 'image/png'],
    ['cover.webp', 'image/webp'],
    ['cover.avif', 'image/avif'],
  ] as const) {
    assert.equal(coverFileError({ name, type, size: coverFileLimit }), null);
    assert.equal(coverFileError({ name, type: '', size: 100 }), null);
    assert.equal(coverContentType(name, ''), type);
  }
  assert.equal(coverContentType('PORTADA.JPEG', 'application/octet-stream'), 'image/jpeg');
});

test('course covers reject empty, oversized, unsupported and incorrectly labeled images', () => {
  for (const file of [
    { name: 'cover.png', type: 'image/png', size: 0 },
    { name: 'cover.png', type: 'image/png', size: coverFileLimit + 1 },
    { name: 'cover.svg', type: 'image/svg+xml', size: 100 },
    { name: 'cover.jpg', type: 'text/html', size: 100 },
    { name: 'cover.heic', type: '', size: 100 },
  ])
    assert.equal(typeof coverFileError(file), 'string');
});
