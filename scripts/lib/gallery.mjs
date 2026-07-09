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

const SCHEME_LABELS = { light: 'Light', dark: 'Dark', both: 'Light & Dark' };

const SECTIONS = [
  { id: 'extensions', label: 'Extensions', isMatch: (entry) => entry.category !== 'theme' },
  { id: 'themes', label: 'Themes', isMatch: (entry) => entry.category === 'theme' },
];

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

// A single-scheme theme shows a plain badge; "both" is conveyed by the preview tabs.
function renderScheme(extension) {
  if (extension.colorScheme === undefined || extension.colorScheme === 'both') {
    return '';
  }

  const label = SCHEME_LABELS[extension.colorScheme];
  return label === undefined ? '' : `<span class="scheme">${escapeHTML(label)}</span>`;
}

// Themes that support both schemes get a Light/Dark tab switcher (CSS-only, no scroll);
// single-scheme themes show one frame. Extensions have no preview.
function renderPreview(extension) {
  const screenshots = extension.screenshots ?? [];
  if (screenshots.length === 0) {
    return '';
  }

  const alt = escapeHTML(extension.name);
  const frame = (url, variant) => `<img class="frame ${variant}" src="${escapeHTML(url)}" alt="${alt} ${variant} screenshot" loading="lazy">`;

  if (extension.colorScheme === 'both' && screenshots.length >= 2) {
    const name = escapeHTML(`${extension.id}-scheme`);
    return [
      '<div class="preview">',
      `<input type="radio" class="tab-input light" id="${escapeHTML(extension.id)}-light" name="${name}" checked>`,
      `<input type="radio" class="tab-input dark" id="${escapeHTML(extension.id)}-dark" name="${name}">`,
      '<div class="tabs">',
      `<label for="${escapeHTML(extension.id)}-light">Light</label>`,
      `<label for="${escapeHTML(extension.id)}-dark">Dark</label>`,
      '</div>',
      `<div class="frames">${frame(screenshots[0], 'light')}${frame(screenshots[1], 'dark')}</div>`,
      '</div>',
    ].join('');
  }

  const variant = extension.colorScheme === 'dark' ? 'dark' : 'light';
  return `<div class="preview single"><div class="frames">${frame(screenshots[0], variant)}</div></div>`;
}

function renderCard(extension) {
  return fillTemplate(CARD, {
    NAME: escapeHTML(extension.name),
    VERSION: escapeHTML(extension.latest.version),
    SCHEME: renderScheme(extension),
    PREVIEW: renderPreview(extension),
    DESCRIPTION: escapeHTML(extension.description),
    AUTHOR: escapeHTML(extension.author),
    ID: escapeHTML(extension.id),
    DEEP_LINK: escapeHTML(`markedit://install-extension?id=${encodeURIComponent(extension.id)}`),
    HOMEPAGE: escapeHTML(extension.homepage),
  });
}

function renderSection({ id, label }, items) {
  if (items.length === 0) {
    return '';
  }

  const cards = items.map(renderCard).join('');
  return `<section id="${id}" class="group"><h2 class="group-title">${escapeHTML(label)}</h2><div class="grid">${cards}</div></section>`;
}

function renderNav(populated) {
  if (populated.length < 2) {
    return '';
  }

  const links = populated
    .map(({ section, items }) => `<a href="#${section.id}">${escapeHTML(section.label)} <span class="nav-count">${items.length}</span></a>`)
    .join('');

  return `<nav class="jump">${links}</nav>`;
}

export function renderGallery(index) {
  const groups = SECTIONS.map((section) => ({
    section,
    items: index.extensions.filter(section.isMatch),
  }));
  const populated = groups.filter(({ items }) => items.length > 0);

  return fillTemplate(SHELL, {
    STYLES,
    NAV: renderNav(populated),
    CARDS: groups.map(({ section, items }) => renderSection(section, items)).join(''),
    COUNT: String(index.extensions.length),
    GENERATED_ISO: escapeHTML(index.generatedAt),
    GENERATED_UTC: escapeHTML(formatDate(index.generatedAt)),
  });
}
