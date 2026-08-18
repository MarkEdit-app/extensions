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

test('gallery uses the app Discover order', () => {
  const entry = (id, fields = {}) => ({
    id,
    name: fields.name ?? id,
    description: 'Description',
    author: 'Author',
    homepage: 'https://example.com',
    category: fields.category ?? 'extension',
    addedDate: fields.addedDate,
    featured: fields.featured,
    latest: {
      version: '1.0.0',
      date: fields.releaseDate,
    },
  });

  const html = renderGallery({
    generatedAt: '2026-08-18T02:00:00Z',
    extensions: [
      entry('theme', { category: 'theme', featured: true, releaseDate: '2026-08-18T02:00:00Z' }),
      entry('theme-10', { name: 'Theme 10', category: 'theme' }),
      entry('same-z', { name: 'Same' }),
      entry('newer', { addedDate: '2026-08-10T00:00:00Z' }),
      entry('featured', { featured: true, addedDate: '2026-08-01T00:00:00Z' }),
      entry('theme-2', { name: 'Theme 2', category: 'theme' }),
      entry('updated', { addedDate: '2026-07-01T00:00:00Z', releaseDate: '2026-08-12T00:00:00Z' }),
      entry('same-a', { name: 'Same' }),
      entry('older', { featured: false, addedDate: '2026-08-01T00:00:00Z' }),
    ],
  });

  const ids = [...html.matchAll(/<article id="([^"]+)" class="card">/g)].map((match) => match[1]);
  assert.deepEqual(ids, [
    'featured',
    'updated',
    'newer',
    'older',
    'same-a',
    'same-z',
    'theme',
    'theme-2',
    'theme-10',
  ]);
});
