import assert from 'node:assert/strict';
import test from 'node:test';
import { updateRawReleaseURL } from '../scripts/release-url.mjs';

test('updates a shorthand raw tag', () => {
  const url = new URL('https://raw.githubusercontent.com/MarkEdit-app/example/v1.0.0/dist/example.js');
  assert.equal(
    updateRawReleaseURL(url, 'v2.0.0'),
    'https://raw.githubusercontent.com/MarkEdit-app/example/v2.0.0/dist/example.js'
  );
});

test('updates a fully qualified raw tag ref', () => {
  const url = new URL('https://raw.githubusercontent.com/MarkEdit-app/example/refs/tags/v1.0.0/dist/example.js');
  assert.equal(
    updateRawReleaseURL(url, 'v2.0.0'),
    'https://raw.githubusercontent.com/MarkEdit-app/example/refs/tags/v2.0.0/dist/example.js'
  );
});
