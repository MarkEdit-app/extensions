// Renders site/index.html from the static templates in ../templates/.
// This module only substitutes {{PLACEHOLDER}} tokens; edit the markup there.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const templatesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const readTemplate = (name) => readFileSync(join(templatesDir, name), 'utf8');

const SHELL = readTemplate('gallery.html');
const CARD = readTemplate('card.html');
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

const SCHEME_LABELS = { light: 'Light', dark: 'Dark', both: 'Light & Dark' };

// GitHub-style alerts (https://docs.github.com/get-started/writing-on-github). Octicon paths.
const ALERTS = {
  note: {
    label: 'Note',
    icon: '<path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>',
  },
  tip: {
    label: 'Tip',
    icon: '<path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"/>',
  },
};

// The general guidance shown once below the header; body is trusted HTML (contains a link).
const NOTE_BODY = 'Every extension is built on the <a href="https://github.com/MarkEdit-app/MarkEdit/wiki/Customization#markedit-api">MarkEdit API</a>. After installing one, restart the app to apply the changes.';

const SECTIONS = [
  { id: 'extensions', label: 'Extensions', hint: 'Plugins that customize the editor\'s behavior', isMatch: (entry) => entry.category !== 'theme' },
  // tip is trusted HTML (author-controlled), rendered without escaping.
  { id: 'themes', label: 'Themes', hint: 'Plugins that override the app\'s appearance', tip: 'Themes aren\'t meant to be added in the app settings; they override the currently selected app theme instead.</p><p>To customize colors, see the <a href="https://github.com/MarkEdit-app/MarkEdit-theming/wiki#customization">MarkEdit-theming wiki</a> for details.', isMatch: (entry) => entry.category === 'theme' },
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

// Render a GitHub-style alert; bodyHtml is trusted (caller escapes untrusted text).
function renderAlert(kind, bodyHtml) {
  const { label, icon } = ALERTS[kind];
  const title = `<p class="alert-title"><svg class="alert-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${icon}</svg>${label}</p>`;
  return `<div class="alert alert-${kind}">${title}<p>${bodyHtml}</p></div>`;
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
  const frame = (url, variant) => `<img class="frame ${variant}" src="${escapeHTML(url)}" alt="${alt} ${variant} screenshot" loading="lazy" decoding="async">`;

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

function renderSection({ id, label, hint, tip }, items) {
  if (items.length === 0) {
    return '';
  }

  const cards = items.map(renderCard).join('');
  const note = hint ? ` <span class="group-note">(${escapeHTML(hint)})</span>` : '';
  const footer = tip ? renderAlert('tip', tip) : '';
  return `<section id="${id}" class="group"><h2 class="group-title">${escapeHTML(label)}${note}</h2><div class="grid">${cards}</div>${footer}</section>`;
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
    NAV: renderNav(populated),
    NOTE: renderAlert('note', NOTE_BODY),
    CARDS: groups.map(({ section, items }) => renderSection(section, items)).join(''),
    GENERATED_ISO: escapeHTML(index.generatedAt),
    GENERATED_UTC: escapeHTML(formatDate(index.generatedAt)),
  });
}
