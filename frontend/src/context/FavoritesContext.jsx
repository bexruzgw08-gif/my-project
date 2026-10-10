import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, errorMessage, unwrap } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const FavoritesContext = createContext(null);

/** Keeps the set of favourite product ids in sync with the server (persisted in MongoDB). */
export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [ids, setIds] = useState(() => new Set());

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    unwrap(api.get('/favorites/ids'))
      .then((d) => setIds(new Set(d.ids)))
      .catch(() => {});
  }, [user]);

  const toggle = useCallback(
    async (productId) => {
      if (!user) {
        navigate('/login', { state: { from: location.pathname + location.search, reason: 'login' } });
        return;
      }
      const isFav = ids.has(productId);
      // Optimistic update with rollback on failure.
      setIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(productId);
        else next.add(productId);
        return next;
      });
      try {
        if (isFav) await api.delete(`/favorites/${productId}`);
        else await api.post(`/favorites/${productId}`);
        toast.success(t(isFav ? 'product.favoriteRemoved' : 'product.favoriteAdded'));
      } catch (err) {
        setIds((prev) => {
          const next = new Set(prev);
          if (isFav) next.add(productId);
          else next.delete(productId);
          return next;
        });
        toast.error(errorMessage(err));
      }
    },
    [user, ids, navigate, location, toast, t],
  );

  const value = useMemo(() => ({ ids, isFavorite: (id) => ids.has(id), toggle, count: ids.size }), [ids, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
