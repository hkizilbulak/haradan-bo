export type VideoPlatform = 'youtube' | 'vimeo' | 'dailymotion' | 'generic' | 'unknown';

export type ParsedVideo = {
  isValid: boolean;
  platform: VideoPlatform;
  platformName: string;
  videoId?: string;
  thumbnailUrl?: string;
  url: string;
};

const YOUTUBE_REGEX =
  /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i;

const VIMEO_REGEX =
  /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)(?:$|\/|\?)/i;

const DAILYMOTION_REGEX =
  /(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/i;

export function parseVideoUrl(rawUrl?: string | null): ParsedVideo {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isValid: false,
      platform: 'unknown',
      platformName: 'Bilinmeyen',
      url: '',
    };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      isValid: false,
      platform: 'unknown',
      platformName: 'Bilinmeyen',
      url: '',
    };
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  const ytMatch = withScheme.match(YOUTUBE_REGEX);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      isValid: true,
      platform: 'youtube',
      platformName: 'YouTube',
      videoId,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      url: withScheme,
    };
  }

  const vimeoMatch = withScheme.match(VIMEO_REGEX);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      isValid: true,
      platform: 'vimeo',
      platformName: 'Vimeo',
      videoId,
      url: withScheme,
    };
  }

  const dailyMatch = withScheme.match(DAILYMOTION_REGEX);
  if (dailyMatch && dailyMatch[1]) {
    const videoId = dailyMatch[1];
    return {
      isValid: true,
      platform: 'dailymotion',
      platformName: 'Dailymotion',
      videoId,
      thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${videoId}`,
      url: withScheme,
    };
  }

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return {
        isValid: true,
        platform: 'generic',
        platformName: parsed.hostname.replace(/^www\./, ''),
        url: withScheme,
      };
    }
  } catch {}

  return {
    isValid: false,
    platform: 'unknown',
    platformName: 'Geçersiz Link',
    url: trimmed,
  };
}

export function openVideoUrl(url?: string | null): void {
  if (!url) return;
  const withScheme = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
  if (typeof window !== 'undefined') {
    window.open(withScheme, '_blank', 'noopener,noreferrer');
  }
}
