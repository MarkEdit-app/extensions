export function registryDate(date = new Date()) {
  date = new Date(date);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString().replace('.000Z', 'Z');
}

export function stampRegistryMetadata(entry, date) {
  const { versions } = entry;
  const isInitialSubmission = versions.every((version) => version.date === undefined);
  let changed = false;

  if (entry.addedDate === undefined) {
    entry.addedDate = date;
    changed = true;
  }

  for (const version of versions) {
    if (version.date === undefined) {
      version.date = date;
      changed = true;
    }
  }

  if (isInitialSubmission && versions[0]?.notes == null) {
    versions[0].notes = 'Initial release.';
    changed = true;
  }

  return changed;
}

export function normalizeRegistryVersion(release) {
  const normalized = {
    version: release.version,
  };

  if (release.date !== undefined) {
    normalized.date = release.date;
  }

  normalized.url = release.url;
  normalized.sha256 = release.sha256;

  if (release.minAppVersion !== undefined) {
    normalized.minAppVersion = release.minAppVersion;
  }

  if (release.notes !== undefined) {
    normalized.notes = release.notes;
  }

  return normalized;
}
