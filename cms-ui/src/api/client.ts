import axios from 'axios';

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:8000';

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

export default api;
