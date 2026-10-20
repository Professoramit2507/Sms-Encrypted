import axios from 'axios';

/**
 * Central API client.
 *
 * Expected environment:
 *   VITE_API_BASE_URL=http://localhost:5000/api
 */

export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    me: '/auth/me',
    refresh: '/auth/refresh',
    profile: '/users/me',
    password: '/users/me/password',
  },
  keys: {
    register: '/keys',
    me: '/keys/me',
    status: '/keys/status',
    byUser: (userId) => `/keys/${encodeURIComponent(userId)}`,
  },
  messages: {
    conversations: '/conversations',
    conversation: (id) => `/conversations/${encodeURIComponent(id)}`,
    messages: (conversationId) => `/conversations/${encodeURIComponent(conversationId)}/messages`,
    send: (conversationId) => `/conversations/${encodeURIComponent(conversationId)}/messages`,
    read: (messageId) => `/messages/${encodeURIComponent(messageId)}/read`,
    delete: (messageId) => `/messages/${encodeURIComponent(messageId)}`,
  },
  contacts: {
    list: '/contacts',
    add: '/contacts',
    remove: (id) => `/contacts/${encodeURIComponent(id)}`,
    profile: (id) => `/contacts/${encodeURIComponent(id)}`,
  },
};

const TOKEN_KEY = 'secure-sms-token';

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (error.code === 'ERR_NETWORK'
        ? 'Unable to reach the server. Check your connection and API URL.'
        : 'Something went wrong. Please try again.');

    const normalized = new Error(message);
    normalized.status = status;
    normalized.data = error.response?.data;
    normalized.isNetwork = error.code === 'ERR_NETWORK' || !error.response;

    if (status === 401) {
      clearStoredToken();
      normalized.code = 'unauthorized';
    }

    return Promise.reject(normalized);
  }
);

export default api;
