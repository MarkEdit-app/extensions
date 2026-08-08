import assert from 'node:assert/strict';
import test from 'node:test';
import { releaseNotes } from '../scripts/github-release.mjs';

test('returns trimmed GitHub release notes', () => {
  assert.equal(releaseNotes({ body: '\n  Added a feature.\n\nFixed a bug.  \n' }), 'Added a feature.\n\nFixed a bug.');
});

test('omits missing or blank GitHub release notes', () => {
  assert.equal(releaseNotes({ body: null }), undefined);
  assert.equal(releaseNotes({ body: ' \n\t' }), undefined);
});
