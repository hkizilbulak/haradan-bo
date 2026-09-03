export const API_PROXY_PREFIX = '/api';
export const API_ORIGIN = '';
export const API_URL = `${API_PROXY_PREFIX}/`;
export const MEDIA_URL = `${API_PROXY_PREFIX}/v1/media`;

const DEFAULT_FRONTEND_URL = 'https://haradan.up.railway.app';

export function getFrontendBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim();
  return (configured || DEFAULT_FRONTEND_URL).replace(/\/+$/, '');
}

export function buildAdvertDetailUrl(advertId: string | number): string {
  const id = String(advertId).trim();
  if (!id) {
    throw new Error('İlan kimliği gerekli.');
  }
  return `${getFrontendBaseUrl()}/advert/${encodeURIComponent(id)}?id=${encodeURIComponent(id)}`;
}

export function buildMediaUrl(assetId: string, profile: string) {
  return `${MEDIA_URL}/${assetId}/${profile}`;
}
