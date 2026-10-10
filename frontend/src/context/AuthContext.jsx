import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import i18n from '../i18n/index.js';
import { api, unwrap } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const applyUser = useCallback((u) => {
    setUser(u);
    if (u?.languageChosen && u.language && u.language !== i18n.language) i18n.changeLanguage(u.language);
  }, []);

  // Restore the session from the httpOnly cookie.
  useEffect(() => {
    unwrap(api.get('/auth/me'))
      .then((d) => applyUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, [applyUser]);

  const login = useCallback(
    async (values) => {
      const d = await unwrap(api.post('/auth/login', values));
      applyUser(d.user);
      return d.user;
    },
    [applyUser],
  );

  const register = useCallback(async (values) => {
    const d = await unwrap(api.post('/auth/register', { ...values, language: i18n.language }));
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const d = await unwrap(api.get('/auth/me'));
    setUser(d.user);
    return d.user;
  }, []);

  const setLanguage = useCallback(
    async (language) => {
      await i18n.changeLanguage(language);
      if (user) {
        const d = await unwrap(api.patch('/users/me/language', { language }));
        setUser(d.user);
      }
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, ready, isAuthed: Boolean(user), login, register, logout, refresh, setUser, setLanguage }),
    [user, ready, login, register, logout, refresh, setLanguage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
