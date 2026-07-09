type RuntimeConfig = {
  __API_BASE_URL__?: string;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function resolveBaseUrl(): string {
  const runtimeBaseUrl = (globalThis as RuntimeConfig).__API_BASE_URL__;

  if (typeof runtimeBaseUrl === 'string' && runtimeBaseUrl.trim().length > 0) {
    return normalizeBaseUrl(runtimeBaseUrl.trim());
  }

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isLocalhost) {
    return '/api';
  }

  return 'https://productos-proyecto.onrender.com/api';
}

export const apiConfig = {
  baseUrl: resolveBaseUrl(),
  tokenHeader: 'X-API-TOKEN',
  tokenValue: '111024'
} as const;