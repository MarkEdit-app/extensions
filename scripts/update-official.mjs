#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compare as compareSemver, valid as validSemver } from 'semver';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const organization = 'MarkEdit-app';
const dryRun = process.argv.includes('--dry-run');
const token = process.env.GITHUB_TOKEN;
const sources = [join(root, 'extensions'), join(root, 'themes')];
const updates = [];
const requestTimeout = 30_000;

for (const directory of sources) {
  if (!existsSync(directory)) {
    continue;
  }

  const files = readdirSync(directory).filter((name) => name.endsWith('.json')).sort();
  for (const file of files) {
    const filePath = join(directory, file);
    const entry = JSON.parse(readFileSync(filePath, 'utf8'));
    const repository = officialRepository(entry);
    if (repository === undefined) {
      continue;
    }

    const release = await latestRelease(repository);
    const version = normalizeVersion(release.tag_name);
    const current = [...entry.versions].sort((a, b) => compareSemver(b.version, a.version))[0];
    if (compareSemver(version, current.version) <= 0) {
      continue;
    }

    const url = releaseURL(entry, current, repository, release);
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(requestTimeout),
    });

    if (!response.ok) {
      throw new Error(`${entry.id}@${version}: ${url} returned ${response.status}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const next = {
      version,
      url,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };

    if (current.minAppVersion !== undefined) {
      next.minAppVersion = current.minAppVersion;
    }

    entry.versions.unshift(next);

    if (!dryRun) {
      writeFileSync(filePath, `${JSON.stringify(entry, null, 2)}\n`);
    }

    updates.push(`${entry.id}: ${current.version} -> ${version}`);
  }
}

if (updates.length === 0) {
  console.log('Official extensions are up to date.');
} else {
  console.log(`${dryRun ? 'Found' : 'Updated'} ${updates.length} official extension(s):`);
  updates.forEach((update) => console.log(`  - ${update}`));
}

function officialRepository(entry) {
  if (entry.author !== organization) {
    return undefined;
  }

  const homepage = new URL(entry.homepage);
  const parts = homepage.pathname.split('/').filter(Boolean);
  if (homepage.hostname !== 'github.com' || parts.length !== 2 || parts[0] !== organization) {
    throw new Error(`${entry.id}: official entry must link to a ${organization} GitHub repository`);
  }

  return parts[1];
}

async function latestRelease(repository) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'MarkEdit-registry-update',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${organization}/${repository}/releases/latest`,
    { headers, signal: AbortSignal.timeout(requestTimeout) }
  );

  if (!response.ok) {
    throw new Error(`${organization}/${repository}: latest release returned ${response.status}`);
  }

  return response.json();
}

function normalizeVersion(tag) {
  const version = typeof tag === 'string' && tag.startsWith('v') ? tag.slice(1) : tag;
  if (typeof version !== 'string' || validSemver(version) === null) {
    throw new Error(`Unsupported release tag: ${tag}`);
  }

  return version;
}

function releaseURL(entry, currentRelease, repository, release) {
  const currentURL = new URL(currentRelease.url);
  const parts = currentURL.pathname.split('/').filter(Boolean);
  const expectedPrefix = [organization, repository];
  if (parts[0] !== expectedPrefix[0] || parts[1] !== expectedPrefix[1]) {
    throw new Error(`${entry.id}: release URL does not match its official repository`);
  }

  if (currentURL.hostname === 'raw.githubusercontent.com' && parts.length >= 4) {
    parts[2] = release.tag_name;
    currentURL.pathname = `/${parts.join('/')}`;
    return currentURL.toString();
  }

  if (currentURL.hostname === 'github.com' && parts[2] === 'releases' && parts[3] === 'download') {
    const assetName = basename(currentURL.pathname);
    const asset = release.assets?.find((item) => item.name === assetName);
    if (asset !== undefined) {
      return asset.browser_download_url;
    }
  }

  throw new Error(`${entry.id}: unsupported release URL: ${currentURL}`);
}
