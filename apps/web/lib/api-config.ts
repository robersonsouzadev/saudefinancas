export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && envUrl.trim() !== '') {
      return envUrl.replace(/\/$/, '');
    }

    const hostname = window.location.hostname;

    if (hostname === 'app.robersonsouza.com.br' || hostname.includes('robersonsouza.com.br')) {
      return 'https://app.robersonsouza.com.br';
    }

    if (hostname === '72.60.249.235') {
      return 'http://72.60.249.235:3001';
    }

    const protocol = window.location.protocol; // e.g. "http:" or "https:"
    return `${protocol}//${hostname}:3001`;
  }

  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}
