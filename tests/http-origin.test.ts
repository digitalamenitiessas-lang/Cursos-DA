import assert from 'node:assert/strict';
import test from 'node:test';
import { assertSameOrigin, HttpError } from '../src/lib/http';

test('same-origin API requests work on production, previews and local development', () => {
  for (const origin of [
    'https://cursos-da.vercel.app',
    'https://project-preview.vercel.app',
    'http://127.0.0.1:3000',
  ]) {
    assert.doesNotThrow(() =>
      assertSameOrigin(
        new Request(`${origin}/api/admin/videos/lesson`, {
          method: 'PUT',
          headers: { Origin: origin },
        }),
      ),
    );
  }
});

test('cross-origin, missing, opaque and spoofed API origins remain forbidden', () => {
  for (const origin of [
    null,
    'null',
    'https://attacker.test',
    'https://cursos-da.vercel.app.attacker.test',
    'https://cursos-da.vercel.app@attacker.test',
    'http://cursos-da.vercel.app',
    'https://cursos-da.vercel.app:444',
    'https://project-preview.vercel.app',
  ]) {
    const request = new Request('https://cursos-da.vercel.app/api/admin/videos/lesson', {
      method: 'PUT',
      headers: origin === null ? {} : { Origin: origin },
    });
    assert.throws(
      () => assertSameOrigin(request),
      (error) => error instanceof HttpError && error.status === 403,
    );
  }
});
