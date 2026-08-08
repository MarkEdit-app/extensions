export function releaseNotes(release) {
  const notes = typeof release.body === 'string' ? release.body.trim() : '';
  return notes || undefined;
}
