const normalizeUrl = (value?: string | null) => {
  if (!value) {
    return '';
  }
  return value.replace(/\/+$/, '');
};

export const API_ORIGIN = normalizeUrl(process.env.NEXT_PUBLIC_API_URL);
export const API_URL = process.env.NEXT_PUBLIC_API_URL;
