// Renders site/index.html from the static templates in ../templates/
// (gallery.html shell, gallery.css, card.html). This module only substitutes
// {{PLACEHOLDER}} tokens; edit the markup and styles in those files directly.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const templatesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const readTemplate = (name) => readFileSync(join(templatesDir, name), 'utf8');

const SHELL = readTemplate('gallery.html');
const STYLES = readTemplate('gallery.css');
const CARD = readTemplate('card.html');
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

function escapeHTML(value) {
  return String(value).replace(/[&<>"]/g, (character) => HTML_ESCAPES[character]);
}

function formatDate(isoString) {
  const formatted = new Date(isoString).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  });

  return `${formatted} UTC`;
}

// Replace {{TOKEN}} placeholders; values are inserted literally (no $ expansion).
function fillTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');
}

function renderCard(extension) {
  return fillTemplate(CARD, {
    NAME: escapeHTML(extension.name),
    VERSION: escapeHTML(extension.latest.version),
    DESCRIPTION: escapeHTML(extension.description),
    AUTHOR: escapeHTML(extension.author),
    ID: escapeHTML(extension.id),
    DEEP_LINK: escapeHTML(`markedit://install-extension?id=${encodeURIComponent(extension.id)}`),
    HOMEPAGE: escapeHTML(extension.homepage),
  });
}

export function renderGallery(index) {
  return fillTemplate(SHELL, {
    STYLES,
    CARDS: index.extensions.map(renderCard).join(''),
    COUNT: String(index.extensions.length),
    GENERATED_ISO: escapeHTML(index.generatedAt),
    GENERATED_UTC: escapeHTML(formatDate(index.generatedAt)),
  });
}
