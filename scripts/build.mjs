#!/usr/bin/env node

// Validates extensions/*.json and themes/*.json, builds index.json, and renders site/.
// Gallery templates and static assets live in ./templates/ and ./assets/.
// Set CHECK_INTEGRITY=false to skip network downloads (schema-only).

import { copyFileSync, readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { renderGallery } from './lib/gallery.mjs';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schemasDir = join(root, 'schemas');
const assetsDir = join(root, 'scripts', 'assets');
const checkIntegrity = process.env.CHECK_INTEGRITY !== 'false';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const readJSON = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'));
const validateIndex = ajv.compile(readJSON(join(schemasDir, 'index.schema.json')));

// Each source folder maps to one category; the schema is picked accordingly.
const sources = [
  { category: 'extension', dir: join(root, 'extensions'), validate: ajv.compile(readJSON(join(schemasDir, 'extension.schema.json'))) },
  { category: 'theme', dir: join(root, 'themes'), validate: ajv.compile(readJSON(join(schemasDir, 'theme.schema.json'))) },
];

const errors = [];
const onError = (message) => errors.push(message);

const seenIds = new Set();
const entries = [];
const verifyTargets = [];

for (const { category, dir, validate } of sources) {
  const files = existsSync(dir)
    ? readdirSync(dir).filter((name) => name.endsWith('.json')).sort()
    : [];

  for (const file of files) {
    let data;
    try {
      data = readJSON(join(dir, file));
    } catch (error) {
      onError(`${file}: invalid JSON - ${error.message}`);
      continue;
    }

    if (!validate(data)) {
      for (const error of validate.errors) {
        onError(`${file}: ${error.instancePath || '/'} ${error.message}`);
      }

      continue;
    }

    const expectedId = basename(file, '.json');
    if (data.id !== expectedId) {
      onError(`${file}: id "${data.id}" must equal the filename "${expectedId}"`);
    }

    if (seenIds.has(data.id)) {
      onError(`duplicate id "${data.id}"`);
    }

    seenIds.add(data.id);

    // The registry vouches for every listed build, so verify them all; the index
    // exposes only the newest one (full history stays in the source entry).
    const versions = [...data.versions].sort((a, b) => compareSemver(b.version, a.version));
    for (const version of versions) {
      verifyTargets.push({ id: data.id, version });
    }

    const newest = versions[0];
    const latest = {
      version: newest.version,
      url: newest.url,
      sha256: newest.sha256,
    };

    if (newest.minAppVersion !== undefined) {
      latest.minAppVersion = newest.minAppVersion;
    }

    // category is derived from the folder, not stored in the source file.
    const { $schema, versions: _history, ...fields } = data;
    entries.push({ ...fields, category, latest });
  }
}

if (checkIntegrity) {
  for (const { id, version } of verifyTargets) {
    try {
      const response = await fetch(version.url, { redirect: 'follow' });
      if (!response.ok) {
        onError(`${id}@${version.version}: ${version.url} returned ${response.status}`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const hash = createHash('sha256').update(buffer).digest('hex');
      if (hash.toLowerCase() !== version.sha256.toLowerCase()) {
        onError(`${id}@${version.version}: sha256 mismatch (declared ${version.sha256}, actual ${hash})`);
      }
    } catch (error) {
      onError(`${id}@${version.version}: fetch failed - ${error.message}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`\nRegistry validation failed (${errors.length}):`);
  for (const message of errors) {
    console.error(`  - ${message}`);
  }

  process.exit(1);
}

entries.sort((a, b) => a.id.localeCompare(b.id));
const index = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  extensions: entries
};

if (!validateIndex(index)) {
  console.error('Generated index.json failed schema:');
  for (const error of validateIndex.errors) {
    console.error(`  - ${error.instancePath || '/'} ${error.message}`);
  }

  process.exit(1);
}

writeFileSync(join(root, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
mkdirSync(join(root, 'site'), { recursive: true });
writeFileSync(join(root, 'site', 'index.html'), renderGallery(index));
for (const name of ['index.css', 'index.js']) {
  copyFileSync(join(assetsDir, name), join(root, 'site', name));
}

const extensionCount = entries.filter((entry) => entry.category === 'extension').length;
const themeCount = entries.length - extensionCount;
console.log(`Built index.json and site/ (${extensionCount} extensions, ${themeCount} themes).`);

/**
 * Compares two semantic versions by their numeric release parts (major, minor, patch),
 * ignoring pre-release and build identifiers.
 */
function compareSemver(a, b) {
  const partsA = a.split(/[.+-]/).map((part) => parseInt(part, 10));
  const partsB = b.split(/[.+-]/).map((part) => parseInt(part, 10));

  for (let index = 0; index < 3; index++) {
    const valueA = partsA[index] || 0;
    const valueB = partsB[index] || 0;
    if (valueA !== valueB) {
      return valueA - valueB;
    }
  }

  return 0;
}
