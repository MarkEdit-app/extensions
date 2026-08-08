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

function renderFeatured(extension) {
  if (extension.featured !== true) {
    return '';
  }

  return '<span class="featured" title="Featured"><svg role="img" aria-label="Featured" viewBox="0 0 26 22" width="19" height="16"><path d="M7.623 19.934c.293.02.594.094.903.225s.571.296.786.498c.156.15.15.286-.02.41-.241.182-.526.316-.854.4s-.64.107-.933.068a2.66 2.66 0 0 1-.894-.234c-.309-.137-.575-.306-.796-.508-.189-.176-.169-.329.059-.459.241-.143.521-.252.84-.327a2.84 2.84 0 0 1 .908-.073zm2.051-3.301c.137-.208.286-.215.449-.02a2.88 2.88 0 0 1 .488.796c.13.309.205.607.225.894.026.299-.008.612-.103.938s-.236.602-.425.83c-.137.169-.273.173-.41.01-.189-.208-.347-.469-.474-.781s-.2-.618-.22-.918a3.01 3.01 0 0 1 .107-.903 2.89 2.89 0 0 1 .361-.845zm-4.805.654c.273.091.542.239.806.444s.474.435.63.688c.117.189.075.319-.127.391a2.38 2.38 0 0 1-.928.176c-.339 0-.645-.055-.918-.166-.273-.098-.542-.251-.806-.459s-.474-.439-.63-.693c-.13-.215-.078-.358.156-.43.273-.085.576-.122.908-.112s.635.063.908.161zm2.813-2.656c.189-.182.335-.156.439.078a2.95 2.95 0 0 1 .264.898c.046.332.039.638-.02.918-.046.306-.156.604-.332.894s-.381.519-.615.688c-.182.13-.316.098-.4-.098a2.57 2.57 0 0 1-.254-.879c-.039-.332-.029-.645.029-.937a3.11 3.11 0 0 1 .327-.845c.16-.29.347-.529.562-.718zM.758 13.508c-.039-.241.065-.348.313-.322.28.033.57.12.869.264a2.85 2.85 0 0 1 .762.518c.208.189.392.43.552.723s.262.589.308.889c.026.221-.065.326-.273.313-.306-.013-.614-.086-.923-.22s-.565-.308-.767-.522c-.208-.202-.391-.454-.547-.757s-.254-.597-.293-.884zm5.596-.84c.247-.091.371-.007.371.254.02.286-.018.591-.112.913a3.16 3.16 0 0 1-.386.854c-.156.254-.374.477-.654.669s-.566.324-.859.396c-.208.039-.322-.046-.342-.254-.007-.306.037-.618.132-.937a2.48 2.48 0 0 1 .405-.82 2.93 2.93 0 0 1 .645-.64c.267-.199.534-.343.801-.435zm-1.631-2.285a2.74 2.74 0 0 1 .786-.454 3.29 3.29 0 0 1 .903-.22c.241-.007.342.111.303.352-.065.286-.186.575-.361.864s-.374.529-.596.718a2.4 2.4 0 0 1-.806.469c-.322.117-.633.173-.933.166-.208-.007-.293-.114-.254-.322a2.72 2.72 0 0 1 .352-.864 2.66 2.66 0 0 1 .605-.708zM.768 9.104c.026-.26.156-.339.391-.234a2.89 2.89 0 0 1 .771.474c.254.212.459.441.615.688.156.254.273.544.352.869a2.6 2.6 0 0 1 .068.908c-.026.221-.143.299-.352.234-.286-.078-.562-.223-.825-.435s-.467-.448-.61-.708a2.87 2.87 0 0 1-.347-.874 2.75 2.75 0 0 1-.063-.923zM5.26 7.102a2.67 2.67 0 0 1 .889-.156c.332-.007.638.029.918.107.234.078.286.215.156.41-.143.247-.347.479-.61.693s-.539.378-.825.488a2.57 2.57 0 0 1-.928.171c-.339.003-.645-.054-.918-.171-.202-.091-.244-.225-.127-.4.156-.254.366-.483.63-.688a2.87 2.87 0 0 1 .815-.454zM1.979 4.543c.117-.221.267-.254.449-.098a3.1 3.1 0 0 1 .562.728c.166.29.278.575.337.854.065.286.078.596.039.928a2.57 2.57 0 0 1-.254.879c-.104.195-.238.231-.4.107-.241-.176-.449-.407-.625-.693s-.293-.579-.352-.879c-.052-.28-.055-.588-.01-.923s.13-.636.254-.903zm5.049-.254c.286-.059.594-.068.923-.029s.623.117.884.234c.228.104.26.251.098.439-.189.215-.426.409-.713.581s-.576.291-.869.356c-.286.078-.597.094-.933.049a2.43 2.43 0 0 1-.894-.293c-.176-.117-.199-.254-.068-.41.182-.228.418-.426.708-.596s.578-.28.864-.332zM4.146 1.281c.143-.202.296-.208.459-.02a3.18 3.18 0 0 1 .459.801c.124.306.195.599.215.879a2.61 2.61 0 0 1-.093.918 2.95 2.95 0 0 1-.376.859c-.117.176-.257.189-.42.039-.215-.215-.389-.479-.522-.791s-.203-.615-.21-.908c-.02-.28.016-.584.107-.913s.218-.617.381-.864zM9.186.295c.247-.033.358.075.332.322-.046.293-.142.591-.288.894s-.317.555-.513.757a2.42 2.42 0 0 1-.771.557 2.51 2.51 0 0 1-.898.244c-.208.007-.303-.094-.283-.303.033-.286.122-.581.269-.884s.324-.555.532-.757a2.98 2.98 0 0 1 .747-.532 2.9 2.9 0 0 1 .874-.298zm9.424 19.639a2.83 2.83 0 0 1 .903.073 2.95 2.95 0 0 1 .845.327c.228.13.247.283.059.459-.221.202-.487.371-.796.508a2.66 2.66 0 0 1-.894.234c-.299.039-.612.016-.937-.068s-.609-.218-.85-.4c-.176-.124-.182-.26-.02-.41.215-.202.477-.368.786-.498s.61-.205.903-.225zm-2.051-3.301c.15.241.267.522.352.845a3.01 3.01 0 0 1 .107.903 2.75 2.75 0 0 1-.21.918c-.127.313-.285.573-.474.781-.143.163-.28.16-.41-.01-.189-.208-.347-.469-.474-.781s-.2-.618-.22-.918a3.01 3.01 0 0 1 .107-.903 2.89 2.89 0 0 1 .361-.845zm4.805.654c.267-.098.568-.151.903-.161a2.8 2.8 0 0 1 .913.112c.234.072.286.215.156.43a2.64 2.64 0 0 1-.635.693 2.97 2.97 0 0 1-.801.459c-.273.111-.579.166-.918.166a2.38 2.38 0 0 1-.928-.176c-.202-.072-.244-.202-.127-.391.156-.254.366-.483.63-.688s.532-.353.806-.444zm-2.812-2.656c.208.189.394.428.557.718a3.03 3.03 0 0 1 .332.845c.059.293.068.605.029.938a2.57 2.57 0 0 1-.254.879c-.085.195-.218.228-.4.098-.234-.169-.439-.399-.615-.688s-.29-.588-.342-.894c-.052-.28-.055-.586-.01-.918a2.95 2.95 0 0 1 .264-.898c.098-.234.244-.26.439-.078zm6.924-1.123c-.039.286-.137.581-.293.884s-.339.555-.547.757c-.202.215-.457.389-.767.522s-.617.207-.923.22c-.215.013-.306-.091-.273-.312.046-.299.148-.596.308-.889s.343-.534.552-.723a2.85 2.85 0 0 1 .762-.518c.299-.143.589-.231.869-.264.247-.026.352.081.313.322zm-5.605-.84a2.83 2.83 0 0 1 .806.435 3.19 3.19 0 0 1 .649.64 2.48 2.48 0 0 1 .405.82 2.86 2.86 0 0 1 .122.938c-.013.208-.124.293-.332.254-.293-.072-.579-.203-.859-.396s-.498-.415-.654-.669a3.16 3.16 0 0 1-.386-.854 2.61 2.61 0 0 1-.112-.913c0-.26.12-.345.361-.254zm1.631-2.285c.234.182.439.418.615.708a2.72 2.72 0 0 1 .352.864c.039.208-.046.316-.254.322-.306.007-.618-.049-.937-.166a2.41 2.41 0 0 1-.801-.469c-.221-.189-.42-.428-.596-.718s-.296-.578-.361-.864c-.039-.241.062-.358.303-.352a3.29 3.29 0 0 1 .903.22c.309.12.568.272.776.454zm3.965-1.279a2.75 2.75 0 0 1-.063.923 2.87 2.87 0 0 1-.347.874c-.15.26-.356.496-.62.708s-.535.356-.815.435c-.208.065-.326-.013-.352-.234a2.6 2.6 0 0 1 .068-.908c.078-.326.195-.615.352-.869.15-.247.353-.477.61-.688s.516-.369.776-.474c.234-.104.365-.026.391.234zm-4.492-2.002a2.87 2.87 0 0 1 .815.454c.264.205.474.435.63.688.111.176.068.309-.127.4a2.32 2.32 0 0 1-.928.171c-.339-.003-.645-.06-.918-.171-.286-.111-.562-.273-.825-.488a2.72 2.72 0 0 1-.62-.693c-.124-.195-.068-.332.166-.41.273-.078.576-.114.908-.107a2.76 2.76 0 0 1 .898.156zm3.271-2.559c.13.267.218.568.264.903s.039.643-.02.923a2.49 2.49 0 0 1-.342.879c-.176.286-.384.518-.625.693-.163.124-.296.088-.4-.107a2.57 2.57 0 0 1-.254-.879c-.039-.332-.026-.641.039-.928.059-.28.171-.565.337-.854s.35-.532.552-.728c.189-.156.339-.124.449.098zm-5.049-.254a2.65 2.65 0 0 1 .874.332c.29.169.526.368.708.596.13.156.104.293-.078.41-.254.15-.549.247-.884.293s-.649.029-.942-.049c-.286-.065-.575-.184-.864-.356s-.529-.366-.718-.581c-.163-.189-.127-.335.107-.439.254-.117.547-.195.879-.234s.638-.029.918.029zm2.891-3.008c.163.247.29.535.381.864s.127.633.107.913c-.007.293-.076.596-.21.908s-.308.576-.522.791c-.163.15-.303.137-.42-.039a2.95 2.95 0 0 1-.376-.859 2.61 2.61 0 0 1-.093-.918c.013-.28.083-.573.21-.879s.282-.573.464-.801c.163-.189.316-.182.459.02zM17.047.295c.286.046.576.145.869.298a3.01 3.01 0 0 1 .742.532 2.72 2.72 0 0 1 .537.757c.15.303.241.597.273.884.02.208-.075.309-.283.303-.299-.02-.601-.101-.903-.244s-.558-.329-.767-.557c-.195-.202-.366-.454-.513-.757S16.76.91 16.715.617c-.026-.247.085-.355.332-.322z"/></svg></span>';
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
    FEATURED: renderFeatured(extension),
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
