import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService.js';
import { getStoredToken, clearStoredToken } from '../services/api.js';
import { registerPublicKey } from '../services/keyService.js';
import {
  initializeUserKeys,
  getEncryptionStatus,
  clearLocalCryptoState,
} from '../crypto/encryptionManager.js';

const USER_SNAPSHOT_KEY = 'secure-sms-user';

function readUserSnapshot() {
  try {
    const raw = sessionStorage.getItem(USER_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeUserSnapshot(user) {
  if (user) sessionStorage.setItem(USER_SNAPSHOT_KEY, JSON.stringify(user));
  else sessionStorage.removeItem(USER_SNAPSHOT_KEY);
}

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readUserSnapshot());
  const [loading, setLoading] = useState(true);
  const [keyStatus, setKeyStatus] = useState(null);

  const refreshKeyStatus = useCallback(async () => {
    const status = await getEncryptionStatus();
    setKeyStatus(status);
    return status;
  }, []);

  const setupKeysIfNeeded = useCallback(async () => {
    let status = await getEncryptionStatus();
    if (!status.hasPrivateKey) {
      const keys = await initializeUserKeys();
      try {
        await registerPublicKey({
          publicKey: keys.publicKeySpki,
          algorithm: keys.algorithm,
          createdAt: keys.createdAt,
        });
      } catch {
        // Backend may be offline; keys remain local so messaging can resume after API is available.
      }
      status = await getEncryptionStatus();
    }
    setKeyStatus(status);
    return status;
  }, []);

  const restoreSession = useCallback(async () => {
    if (!getStoredToken()) {
      writeUserSnapshot(null);
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const current = await authService.getCurrentUser();
      writeUserSnapshot(current);
      setUser(current);
      await refreshKeyStatus();
    } catch (err) {
      if (err.status === 401) {
        await authService.refreshSession();
        try {
          const current = await authService.getCurrentUser();
          writeUserSnapshot(current);
          setUser(current);
          await refreshKeyStatus();
        } catch {
          clearStoredToken();
          writeUserSnapshot(null);
          setUser(null);
        }
      } else if (err.isNetwork) {
        setUser((prev) => prev || readUserSnapshot());
      } else {
        clearStoredToken();
        writeUserSnapshot(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshKeyStatus]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(
    async (credentials) => {
      const result = await authService.login(credentials);
      writeUserSnapshot(result.user);
      setUser(result.user);
      await setupKeysIfNeeded();
      return result.user;
    },
    [setupKeysIfNeeded]
  );

  const register = useCallback(
    async (payload) => {
      const result = await authService.register(payload);
      writeUserSnapshot(result.user);
      setUser(result.user);
      await setupKeysIfNeeded();
      return result.user;
    },
    [setupKeysIfNeeded]
  );

  const logout = useCallback(async () => {
    await authService.logout();
    writeUserSnapshot(null);
    setUser(null);
    // Clear in-memory user/session state. Key material stays device-local unless regenerated.
    setKeyStatus(null);
  }, []);

  const updateUser = useCallback((next) => {
    setUser((prev) => {
      const merged = { ...prev, ...next };
      writeUserSnapshot(merged);
      return merged;
    });
  }, []);

  const destroyLocalKeys = useCallback(async () => {
    await clearLocalCryptoState();
    setKeyStatus(await getEncryptionStatus());
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user) || Boolean(getStoredToken()),
      loading,
      keyStatus,
      login,
      register,
      logout,
      restoreSession,
      refreshKeyStatus,
      setupKeysIfNeeded,
      updateUser,
      destroyLocalKeys,
    }),
    [
      user,
      loading,
      keyStatus,
      login,
      register,
      logout,
      restoreSession,
      refreshKeyStatus,
      setupKeysIfNeeded,
      updateUser,
      destroyLocalKeys,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
