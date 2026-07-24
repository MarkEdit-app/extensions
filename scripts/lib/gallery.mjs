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
//
// Each colorPatterns entry is a comma-separated list of up to 6 hex colors with these
// fixed slots, rendered as a self-contained SVG mock-up of an editor:
const PATTERN_SLOTS = ['background', 'text', 'accent', 'keyword', 'string', 'comment'];

// Illustrated rows mimic a tidy code snippet, with each role in a consistent position so
// same colors group visually: a muted comment line, an accent "heading", then indented
// code with strings trailing on the right. Each token is [widthPx, slot].
const PREVIEW_ROWS = [
  { indent: 0, tokens: [[64, 'comment'], [158, 'comment']] },
  { indent: 0, tokens: [[168, 'accent']] },
  { indent: 0, tokens: [[46, 'keyword'], [150, 'text']] },
  { indent: 22, tokens: [[110, 'text'], [74, 'string']] },
  { indent: 22, tokens: [[60, 'keyword'], [96, 'string']] },
];

// Resolves the fixed slots from one comma-separated entry, falling back gracefully
// when a theme provides fewer than 6 colors.
function parsePattern(pattern) {
  const colors = pattern.split(',').map((value) => value.trim()).filter(Boolean);
  const slot = (name) => {
    const index = PATTERN_SLOTS.indexOf(name);
    return colors[index] ?? colors[2] ?? colors[1] ?? colors[0] ?? '#888888';
  };

  return { background: colors[0] ?? '#ffffff', slot };
}

// Renders one palette as an SVG editor illustration.
function renderSwatch(pattern, variant, alt) {
  const { background, slot } = parsePattern(pattern);
  const padX = 24;
  const baseY = 30;
  const rowGap = 30;
  const gap = 8;
  const barHeight = 16;
  let maxRight = 0;

  const rows = PREVIEW_ROWS.map((row, index) => {
    const y = baseY + index * rowGap - barHeight / 2;
    let x = padX + row.indent;
    return row.tokens.map(([width, name]) => {
      const rect = `<rect x="${x}" y="${y}" width="${width}" height="${barHeight}" rx="${barHeight / 2}" fill="${escapeHTML(slot(name))}"/>`;
      x += width + gap;
      maxRight = Math.max(maxRight, x - gap);
      return rect;
    }).join('');
  }).join('');

  // Pad all sides consistently: right matches left (padX), bottom matches top.
  const topPad = baseY - barHeight / 2;
  const vbWidth = maxRight + padX;
  const vbHeight = baseY + (PREVIEW_ROWS.length - 1) * rowGap + barHeight / 2 + topPad;

  return [
    `<svg class="frame ${variant}" viewBox="0 0 ${vbWidth} ${vbHeight}" role="img" aria-label="${alt} ${variant} preview" preserveAspectRatio="xMidYMid slice">`,
    `<rect width="${vbWidth}" height="${vbHeight}" fill="${escapeHTML(background)}"/>`,
    rows,
    '</svg>',
  ].join('');
}

function renderPreview(extension) {
  const patterns = extension.colorPatterns ?? [];
  if (patterns.length === 0) {
    return '';
  }

  const alt = escapeHTML(extension.name);
  if (extension.colorScheme === 'both' && patterns.length >= 2) {
    const name = escapeHTML(`${extension.id}-scheme`);
    return [
      '<div class="preview">',
      `<input type="radio" class="tab-input light" id="${escapeHTML(extension.id)}-light" name="${name}" checked>`,
      `<input type="radio" class="tab-input dark" id="${escapeHTML(extension.id)}-dark" name="${name}">`,
      '<div class="tabs">',
      `<label for="${escapeHTML(extension.id)}-light">Light</label>`,
      `<label for="${escapeHTML(extension.id)}-dark">Dark</label>`,
      '</div>',
      `<div class="frames">${renderSwatch(patterns[0], 'light', alt)}${renderSwatch(patterns[1], 'dark', alt)}</div>`,
      '</div>',
    ].join('');
  }

  const variant = extension.colorScheme === 'dark' ? 'dark' : 'light';
  return `<div class="preview single"><div class="frames">${renderSwatch(patterns[0], variant, alt)}</div></div>`;
}

function renderCard(extension) {
  return fillTemplate(CARD, {
    ICON: `<span class="icon icon-name ${extension.category === 'theme' ? 'icon-theme' : 'icon-extension'}" aria-hidden="true"></span>`,
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
    items: index.extensions.filter(section.isMatch).sort((lhs, rhs) => {
      // Featured entries float to the top, then sort alphabetically
      return ((rhs.featured === true) - (lhs.featured === true)) || lhs.id.localeCompare(rhs.id);
    }),
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
