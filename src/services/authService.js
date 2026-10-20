import api, { ENDPOINTS, setStoredToken, clearStoredToken } from './api.js';

const USE_MOCK = false;
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_STORAGE_KEY = 'mock_users_db';
const getMockUsers = () => {
  const saved = localStorage.getItem(MOCK_STORAGE_KEY);
  if (saved) return JSON.parse(saved);

  const defaultUsers = [
    {
      id: 'demo-user-1',
      fullName: 'Sender Demo',
      username: 'sender',
      email: 'sender@gmail.com',
      password: 'demo12345',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'c1',
      fullName: 'Alice Johnson (Receiver)',
      username: 'alice',
      email: 'alice@gmail.com',
      password: 'demo12345',
      createdAt: new Date().toISOString(),
    },
  ];
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
};

const MOCK_CONTACTS_KEY = 'mock_contacts_db';
const getMockContacts = () => {
  const saved = localStorage.getItem(MOCK_CONTACTS_KEY);
  if (saved) return JSON.parse(saved);

  const defaultContacts = [
    { id: 'c1', fullName: 'Alice Johnson', username: 'alice', email: 'alice@gmail.com' },
    { id: 'demo-user-1', fullName: 'Sender Demo', username: 'sender', email: 'sender@gmail.com' },
  ];
  localStorage.setItem(MOCK_CONTACTS_KEY, JSON.stringify(defaultContacts));
  return defaultContacts;
};

function unwrapUser(data) {
  if (!data) return null;
  const user = data.user || data;
  const { token, password, refreshToken, privateKey, ...safe } = user;
  return safe;
}

export async function login({ identifier, password }) {
  if (USE_MOCK) {
    await delay(500);
    const users = getMockUsers();
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    let user = users.find(
      (u) =>
        (u.email?.toLowerCase() === cleanId ||
          u.username?.toLowerCase() === cleanId) &&
        u.password === cleanPass
    );

    if (!user && cleanPass === 'demo12345') {
      if (cleanId === 'sender@gmail.com' || cleanId === 'sender' || cleanId === 'demo@gmail.com') {
        user = users.find((u) => u.id === 'demo-user-1') || {
          id: 'demo-user-1',
          fullName: 'Sender Demo',
          username: 'sender',
          email: 'sender@gmail.com',
        };
      } else if (cleanId === 'alice@gmail.com' || cleanId === 'alice') {
        user = users.find((u) => u.id === 'c1') || {
          id: 'c1',
          fullName: 'Alice Johnson (Receiver)',
          username: 'alice',
          email: 'alice@gmail.com',
        };
      }
    }

    if (!user) {
      const error = new Error('Invalid credentials. Check your email/username and password.');
      error.status = 401;
      throw error;
    }

    const token = `mock-token-${user.id}-${Date.now()}`;
    setStoredToken(token);
    localStorage.setItem('mock_current_user', JSON.stringify(user));
    return { token, user: unwrapUser(user) };
  }

  const { data } = await api.post(ENDPOINTS.auth.login, { identifier, password });
  if (data.token) setStoredToken(data.token);
  return { token: data.token, user: unwrapUser(data) };
}

export async function register({ fullName, username, email, password, role }) {
  if (USE_MOCK) {
    await delay(500);
    const users = getMockUsers();

    if (users.some((u) => u.email === email || u.username === username)) {
      const error = new Error('User already exists with this email or username.');
      error.status = 409;
      throw error;
    }

    const newUser = {
      id: `user-${Date.now()}`,
      fullName,
      username,
      email,
      password,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(users));

    const token = `mock-token-${newUser.id}-${Date.now()}`;
    setStoredToken(token);
    localStorage.setItem('mock_current_user', JSON.stringify(newUser));
    return { token, user: unwrapUser(newUser) };
  }

  const { data } = await api.post(ENDPOINTS.auth.register, {
    fullName,
    username,
    email,
    password,
    role: role || 'sender',
  });
  if (data.token) setStoredToken(data.token);
  return { token: data.token, user: unwrapUser(data) };
}

export async function logout() {
  if (USE_MOCK) {
    await delay(150);
    localStorage.removeItem('mock_current_user');
    clearStoredToken();
    return;
  }

  try {
    await api.post(ENDPOINTS.auth.logout);
  } catch {
    // Session cleanup
  } finally {
    clearStoredToken();
  }
}

export async function getCurrentUser() {
  if (USE_MOCK) {
    await delay(200);
    const saved = localStorage.getItem('mock_current_user');
    return saved ? unwrapUser(JSON.parse(saved)) : null;
  }

  const { data } = await api.get(ENDPOINTS.auth.me);
  return unwrapUser(data);
}

export async function refreshSession() {
  if (USE_MOCK) return 'mock-refreshed-token';
  try {
    const { data } = await api.post(ENDPOINTS.auth.refresh);
    if (data?.token) setStoredToken(data.token);
    return data?.token ?? null;
  } catch {
    return null;
  }
}

export async function updateProfile(payload) {
  if (USE_MOCK) {
    await delay(300);
    const saved = localStorage.getItem('mock_current_user');
    if (!saved) throw new Error('Unauthorized');

    const currentUser = JSON.parse(saved);
    const updated = { ...currentUser, ...payload };
    localStorage.setItem('mock_current_user', JSON.stringify(updated));
    return unwrapUser(updated);
  }

  const { data } = await api.put(ENDPOINTS.auth.profile, payload);
  return unwrapUser(data);
}

export async function changePassword({ currentPassword, newPassword }) {
  if (USE_MOCK) {
    await delay(300);
    const saved = localStorage.getItem('mock_current_user');
    if (!saved) throw new Error('Unauthorized');

    const currentUser = JSON.parse(saved);
    if (currentUser.password !== currentPassword) {
      const err = new Error('Current password is incorrect');
      err.status = 400;
      throw err;
    }

    currentUser.password = newPassword;
    localStorage.setItem('mock_current_user', JSON.stringify(currentUser));
    return { success: true };
  }

  const { data } = await api.put(ENDPOINTS.auth.password, { currentPassword, newPassword });
  return data;
}

export async function getContacts() {
  if (USE_MOCK) {
    await delay(250);
    const currentUser = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
    const all = getMockContacts();
    // নিজের আইডি ছাড়া বাকি কন্টাক্ট রিটার্ন করবে
    return all.filter((c) => c.id !== currentUser.id);
  }

  const { data } = await api.get(ENDPOINTS.contacts.list);
  return data.contacts || data;
}

export async function addContact(identifier) {
  if (USE_MOCK) {
    await delay(250);
    const contacts = getMockContacts();
    const newContact = {
      id: `c-${Date.now()}`,
      fullName: identifier,
      username: identifier,
      email: `${identifier}@gmail.com`,
    };
    contacts.push(newContact);
    localStorage.setItem(MOCK_CONTACTS_KEY, JSON.stringify(contacts));
    return newContact;
  }

  const { data } = await api.post(ENDPOINTS.contacts.add, { identifier });
  return data.contact || data;
}

export async function removeContact(id) {
  if (USE_MOCK) {
    await delay(200);
    const contacts = getMockContacts().filter((c) => c.id !== id);
    localStorage.setItem(MOCK_CONTACTS_KEY, JSON.stringify(contacts));
    return;
  }

  await api.delete(ENDPOINTS.contacts.remove(id));
}

export async function getContactProfile(id) {
  if (USE_MOCK) {
    await delay(200);
    const contact = getMockContacts().find((c) => c.id === id);
    return contact || null;
  }

  const { data } = await api.get(ENDPOINTS.contacts.profile(id));
  return data.contact || data;
}