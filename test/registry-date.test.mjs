import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRegistryVersion, registryDate, stampRegistryMetadata } from '../scripts/registry-date.mjs';

test('registryDate truncates to the UTC hour', () => {
  assert.equal(registryDate('2026-08-12T10:56:18+08:00'), '2026-08-12T02:00:00Z');
});

test('initial submissions receive a date and default notes', () => {
  const entry = { versions: [{ version: '1.0.0' }] };

  assert.equal(stampRegistryMetadata(entry, '2026-08-12T02:00:00Z'), true);
  assert.deepEqual(entry, {
    versions: [{
      version: '1.0.0',
      date: '2026-08-12T02:00:00Z',
      notes: 'Initial release.',
    }],
    addedDate: '2026-08-12T02:00:00Z',
  });
});

test('initial submissions preserve provided notes', () => {
  const entry = { versions: [{ version: '1.0.0', notes: 'A tailored introduction.' }] };

  stampRegistryMetadata(entry, '2026-08-12T02:00:00Z');
  assert.equal(entry.versions[0].notes, 'A tailored introduction.');
});

test('updates receive a date without default notes', () => {
  const entry = {
    addedDate: '2026-08-01T00:00:00Z',
    versions: [
      { version: '1.1.0' },
      { version: '1.0.0', date: '2026-08-01T00:00:00Z', notes: 'Initial release.' },
    ],
  };

  assert.equal(stampRegistryMetadata(entry, '2026-08-12T02:00:00Z'), true);
  assert.equal(entry.addedDate, '2026-08-01T00:00:00Z');
  assert.equal(entry.versions[0].date, '2026-08-12T02:00:00Z');
  assert.equal(entry.versions[0].notes, undefined);
});

test('existing dates are preserved', () => {
  const entry = {
    addedDate: '2000-01-01T00:00:00Z',
    versions: [{ version: '1.0.0', date: '2000-01-01T00:00:00Z' }],
  };

  assert.equal(stampRegistryMetadata(entry, '2026-08-12T02:00:00Z'), false);
  assert.equal(entry.addedDate, '2000-01-01T00:00:00Z');
  assert.equal(entry.versions[0].date, '2000-01-01T00:00:00Z');
  assert.equal(entry.versions[0].notes, undefined);
});

test('release fields use canonical order', () => {
  const release = normalizeRegistryVersion({
    notes: 'Initial release.',
    sha256: 'abc',
    url: 'https://example.com/sample.js',
    date: '2026-08-12T02:00:00Z',
    version: '1.0.0',
  });

  assert.deepEqual(Object.keys(release), ['version', 'date', 'url', 'sha256', 'notes']);
});
