export function releaseAssetURL(assets, assetName) {
  return assets?.find((asset) => asset.name === assetName)?.browser_download_url;
}

export function updateRawReleaseURL(currentURL, tag) {
  if (currentURL.hostname !== 'raw.githubusercontent.com') {
    return undefined;
  }

  const parts = currentURL.pathname.split('/').filter(Boolean);
  if (parts.length < 4) {
    return undefined;
  }

  const tagIndex = parts.length >= 6 && parts[2] === 'refs' && parts[3] === 'tags' ? 4 : 2;
  parts[tagIndex] = tag;
  currentURL.pathname = `/${parts.join('/')}`;
  return currentURL.toString();
}
