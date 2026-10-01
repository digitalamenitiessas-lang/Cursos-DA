import assert from 'node:assert/strict';
import test from 'node:test';
import { credentialsSchema, safeNext } from '../src/lib/auth-validation';
import { canPlayLesson, playbackTtl, safeUploadName } from '../src/lib/media/security';

test('login destinations stay local and preserve valid course purchase routes', () => {
  for (const next of [
    '/mi-aula',
    '/admin',
    '/comprar/7d08e97c-f8e1-4c10-9d2b-981fa2c6814b',
    '/cursos?category=diseno&page=2',
  ]) {
    assert.equal(safeNext(next), next);
    assert.equal(new URL(safeNext(next), 'https://academia.test').origin, 'https://academia.test');
  }
});

test('external, protocol-relative, encoded-control and malformed login redirects are rejected', () => {
  for (const next of [
    null,
    undefined,
    {},
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/%2F%2Fevil.test',
    '/%5cevil.test',
    '/%0d%0aLocation=evil.test',
    '/mi-aula\n',
    '/mi-aula%00',
    '/invalid%',
    'javascript:alert(1)',
  ]) {
    assert.equal(safeNext(next), '/mi-aula', String(next));
  }
  assert.equal(safeNext('https://evil.test', '/ingresar'), '/ingresar');
});

test('credentials reject malformed email and password bounds', () => {
  assert.equal(
    credentialsSchema.safeParse({ email: 'alumno@example.test', password: 'test-password' })
      .success,
    true,
  );
  for (const credentials of [
    { email: 'not-an-email', password: 'test-password' },
    { email: 'a@example.test', password: 'short' },
    { email: 'a@example.test', password: 'a'.repeat(129) },
  ]) {
    assert.equal(credentialsSchema.safeParse(credentials).success, false);
  }
});

const noAccess = { isAdmin: false, hasAccess: false, isPreview: false, courseStatus: 'published' };
test('private playback denies visitors and students without a grant', () => {
  assert.equal(canPlayLesson(noAccess), false);
  for (const courseStatus of ['draft', 'archived', 'deleted', ''])
    assert.equal(canPlayLesson({ ...noAccess, courseStatus }), false);
});

test('published samples can play publicly but archived and draft samples cannot', () => {
  assert.equal(canPlayLesson({ ...noAccess, isPreview: true }), true);
  for (const courseStatus of ['draft', 'archived'])
    assert.equal(canPlayLesson({ ...noAccess, isPreview: true, courseStatus }), false);
});

test('archiving preserves purchaser playback while a draft stays unavailable', () => {
  assert.equal(canPlayLesson({ ...noAccess, hasAccess: true }), true);
  assert.equal(canPlayLesson({ ...noAccess, hasAccess: true, courseStatus: 'archived' }), true);
  assert.equal(canPlayLesson({ ...noAccess, hasAccess: true, courseStatus: 'draft' }), false);
  assert.equal(canPlayLesson({ ...noAccess, isAdmin: true, courseStatus: 'draft' }), true);
});

test('playback token lifetime accommodates a ten-hour class and stays bounded', () => {
  assert.equal(playbackTtl(0), 7200);
  assert.equal(playbackTtl(60), 7200);
  assert.ok(playbackTtl(36000) > 36000 + 3600);
  assert.equal(playbackTtl(1000000), 86400);
});

test('uploaded storage paths use a sanitized extension, never the supplied path', () => {
  assert.equal(safeUploadName('../../course/notes.PDF'), 'pdf');
  assert.equal(safeUploadName('clase.final.mp4'), 'mp4');
  for (const name of [
    'notes.',
    'notes.p/d/f',
    'notes.<svg>',
    'notes.123456789',
    'notes.pdf?download=1',
  ]) {
    assert.throws(() => safeUploadName(name));
  }
});
