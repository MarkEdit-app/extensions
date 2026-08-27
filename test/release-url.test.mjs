import assert from 'node:assert/strict';
import test from 'node:test';
import { releaseAssetURL, updateRawReleaseURL } from '../scripts/release-url.mjs';

test('finds a matching GitHub Release asset', () => {
  const assets = [
    { name: 'example.js', browser_download_url: 'https://github.com/MarkEdit-app/example/releases/download/v2.0.0/example.js' },
  ];
  assert.equal(releaseAssetURL(assets, 'example.js'), assets[0].browser_download_url);
  assert.equal(releaseAssetURL(assets, 'other.js'), undefined);
});

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
