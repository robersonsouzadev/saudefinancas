// Utility helper for managing token in cookies & localStorage + authFetch

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  // Save in localStorage
  localStorage.setItem('access_token', token);
  // Set cookie for Next.js middleware (valid for 7 days)
  document.cookie = `sf_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
}

export function removeAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  document.cookie = 'sf_token=; path=/; max-age=0; SameSite=Lax';
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Try localStorage first
  const localToken = localStorage.getItem('access_token');
  if (localToken) return localToken;
  
  // Try reading sf_token from cookies
  const match = document.cookie.match(/(?:^|; )sf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Ensure relative endpoints carry /api prefix if not already present
  let endpoint = url;
  if (endpoint.startsWith('/') && !endpoint.startsWith('/api/') && endpoint !== '/api') {
    endpoint = `/api${endpoint}`;
  }

  return fetch(endpoint, {
    ...options,
    headers,
  });
}

export async function parseJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (err) {
    return { message: text };
  }
}
