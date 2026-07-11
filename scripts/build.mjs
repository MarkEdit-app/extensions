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

    if (newest.notes !== undefined) {
      latest.notes = newest.notes;
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
const indexPath = join(root, 'index.json');
const indexData = {
  schemaVersion: 1,
  extensions: entries
};

if (!validateIndex(indexData)) {
  console.error('Generated index.json failed schema:');
  for (const error of validateIndex.errors) {
    console.error(`  - ${error.instancePath || '/'} ${error.message}`);
  }

  process.exit(1);
}

writeFileSync(indexPath, `${JSON.stringify(indexData, null, 2)}\n`);
mkdirSync(join(root, 'site'), { recursive: true });
writeFileSync(join(root, 'site', 'index.html'), renderGallery({ ...indexData, generatedAt: new Date().toISOString() }));
for (const name of ['index.css', 'index.js']) {
  copyFileSync(join(assetsDir, name), join(root, 'site', name));
}

const extensionCount = entries.filter((entry) => entry.category === 'extension').length;
const themeCount = entries.length - extensionCount;
console.log(`Built index.json and site/ (${extensionCount} extensions, ${themeCount} themes).`);

/**
 * Compares two semantic versions by precedence (SemVer §11): numeric release parts
 * first, then pre-release (a build with a pre-release ranks below its release).
 * Build metadata is ignored.
 */
function compareSemver(a, b) {
  const parse = (version) => {
    const core = version.replace(/\+.*$/, '');
    const dash = core.indexOf('-');
    const release = dash === -1 ? core : core.slice(0, dash);
    return {
      nums: release.split('.').map((part) => parseInt(part, 10) || 0),
      prerelease: dash === -1 ? '' : core.slice(dash + 1),
    };
  };

  const left = parse(a);
  const right = parse(b);

  for (let index = 0; index < 3; index++) {
    const valueA = left.nums[index] || 0;
    const valueB = right.nums[index] || 0;
    if (valueA !== valueB) {
      return valueA - valueB;
    }
  }

  // Same release: a build without a pre-release outranks any pre-release.
  if (left.prerelease === right.prerelease) {
    return 0;
  }

  if (left.prerelease === '' || right.prerelease === '') {
    return left.prerelease === '' ? 1 : -1;
  }

  return comparePrerelease(left.prerelease, right.prerelease);
}

/**
 * Compares two pre-release strings by dot-separated identifiers (SemVer §11.4):
 * numeric identifiers compare numerically and rank below alphanumeric ones, and a
 * shorter set of identifiers ranks lower when all preceding ones are equal.
 */
function comparePrerelease(a, b) {
  const idsA = a.split('.');
  const idsB = b.split('.');
  const length = Math.max(idsA.length, idsB.length);

  for (let index = 0; index < length; index++) {
    const idA = idsA[index];
    const idB = idsB[index];
    if (idA === idB) {
      continue;
    }

    if (idA === undefined) {
      return -1;
    }

    if (idB === undefined) {
      return 1;
    }

    const numericA = /^[0-9]+$/.test(idA);
    const numericB = /^[0-9]+$/.test(idB);
    if (numericA && numericB) {
      return parseInt(idA, 10) - parseInt(idB, 10);
    }

    if (numericA !== numericB) {
      return numericA ? -1 : 1;
    }

    return idA < idB ? -1 : 1;
  }

  return 0;
}
