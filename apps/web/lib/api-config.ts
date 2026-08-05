export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && envUrl.trim() !== '') {
      return envUrl.replace(/\/$/, '');
    }

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    if (hostname === 'app.robersonsouza.com.br' || hostname.includes('robersonsouza.com.br')) {
      return 'https://app.robersonsouza.com.br';
    }

    if (hostname === '2.24.82.19') {
      return 'http://2.24.82.19:3001';
    }

    // Default fallback for any host (localhost, local IP, VPS IP)
    return `${protocol}//${hostname}:3001`;
  }

  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}
