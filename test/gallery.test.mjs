import assert from 'node:assert/strict';
import test from 'node:test';
import { renderGallery } from '../scripts/lib/gallery.mjs';

test('version label tooltip combines release date and notes', () => {
  const html = renderGallery({
    generatedAt: '2026-08-12T02:00:00Z',
    extensions: [{
      id: 'sample',
      name: 'Sample',
      description: 'Sample extension.',
      author: 'Author',
      homepage: 'https://example.com',
      category: 'extension',
      latest: {
        version: '1.0.0',
        date: '2026-08-12T02:00:00Z',
        notes: 'Fix "quotes" & more.',
      },
    }],
  });

  assert.match(html, /<span class="ver" title="Aug 12, 2026 UTC: Fix &quot;quotes&quot; &amp; more\." data-date="2026-08-12T02:00:00Z" data-notes="Fix &quot;quotes&quot; &amp; more\.">v1\.0\.0<\/span>/);
});
