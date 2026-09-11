/**
 * Central Environment Configuration
 * Decouples frontend from hardcoded backend URLs.
 * Supports VITE_API_URL and VITE_WS_URL environment variables.
 */

const getApiBaseUrl = (): string => {
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && envApiUrl.trim() !== '') {
    return envApiUrl.replace(/\/+$/, '');
  }
  
  // Local development fallback
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3001';
  }

  // Same-origin production fallback (e.g., behind Nginx reverse proxy)
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '');
  }

  return 'http://localhost:3001';
};

const getWsBaseUrl = (): string => {
  const envWsUrl = import.meta.env.VITE_WS_URL;
  if (envWsUrl && envWsUrl.trim() !== '') {
    return envWsUrl.replace(/\/+$/, '');
  }

  const apiBase = getApiBaseUrl();
  if (apiBase.startsWith('https://')) {
    return apiBase.replace('https://', 'wss://');
  } else if (apiBase.startsWith('http://')) {
    return apiBase.replace('http://', 'ws://');
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  return 'ws://localhost:3001';
};

export const API_BASE_URL = getApiBaseUrl();
export const WS_BASE_URL = getWsBaseUrl();
export const WS_STREAM_URL = `${WS_BASE_URL}/ws/stream`;

export const endpoints = {
  symbols: `${API_BASE_URL}/api/market/symbols`,
  analyze: (symbol: string, interval: string) => `${API_BASE_URL}/api/market/analyze/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}`,
  generateSignals: (symbol: string) => `${API_BASE_URL}/api/signals/generate/${encodeURIComponent(symbol)}`,
  scanNSE: `${API_BASE_URL}/api/scan/nse`,
  scanStatus: `${API_BASE_URL}/api/scan/status`,
  scanResults: `${API_BASE_URL}/api/scan/results`,
};
