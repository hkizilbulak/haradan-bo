export function readStoredAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  const directToken = localStorage.getItem('access_token');
  if (directToken) {
    return directToken;
  }

  const storedSession = localStorage.getItem('user_session');
  if (!storedSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedSession);
    return parsed?.user?.accessToken || parsed?.user?.access_token || null;
  } catch {
    return null;
  }
}

export function clearStoredAuthSession() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('user_session');
  localStorage.removeItem('access_token');
}
