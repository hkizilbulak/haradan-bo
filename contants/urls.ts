export const API_PROXY_PREFIX = '/api';
export const API_ORIGIN = '';
export const API_URL = `${API_PROXY_PREFIX}/`;
export const MEDIA_URL = `${API_PROXY_PREFIX}/v1/media`;

export function buildMediaUrl(assetId: string, profile: string) {
  return `${MEDIA_URL}/${assetId}/${profile}`;
}
