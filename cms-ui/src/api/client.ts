import axios from 'axios';

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || '';

let currentRole = localStorage.getItem('peblo_role') || 'admin';

export const setStoredRole = (role: 'admin' | 'editor') => {
  currentRole = role;
  localStorage.setItem('peblo_role', role);
};

export const getStoredRole = (): 'admin' | 'editor' => {
  return (localStorage.getItem('peblo_role') as 'admin' | 'editor') || 'admin';
};

const api = axios.create({
  baseURL: `${BACKEND_URL}/api/v1`,
});

api.interceptors.request.use((config) => {
  config.headers['X-User-Role'] = getStoredRole();
  return config;
});

export const getMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_URL}${cleanPath}`;
};

export const FALLBACK_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='900' viewBox='0 0 600 900'%3E%3Crect width='600' height='900' fill='%23131b2e'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23f59e0b' font-family='sans-serif' font-size='28' font-weight='bold'%3EPEBLO TV%3C/text%3E%3C/svg%3E";

export const FALLBACK_BANNER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1280' height='720' viewBox='0 0 1280 720'%3E%3Crect width='1280' height='720' fill='%230f172a'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23f59e0b' font-family='sans-serif' font-size='42' font-weight='bold'%3EPEBLO TV%3C/text%3E%3C/svg%3E";

export default api;
