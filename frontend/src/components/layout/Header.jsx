import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  CircleHelp,
  ClipboardList,
  EllipsisVertical,
  Globe,
  Heart,
  LayoutList,
  LogIn,
  LogOut,
  Package,
  Plus,
  Settings,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import { LANGUAGES } from '../../i18n/index.js';
import { api, unwrap } from '../../lib/api.js';
import { Avatar, Button, Logo } from '../ui/index.jsx';
import SearchBar from './SearchBar.jsx';

function useUnreadCount(user, pathname) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) {
      setCount(0);
      return undefined;
    }
    let alive = true;
    const load = () =>
      unwrap(api.get('/notifications/unread-count'))
        .then((d) => alive && setCount(d.unread))
        .catch(() => {});
    load();
    const timer = setInterval(load, 45000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [user, pathname]);
  return count;
}

function IconLink({ to, label, icon: Icon, badge }) {
  return (
    <NavLink
      to={to}
      title={label}
      aria-label={label}
      className={({ isActive }) =>
        `relative inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-sand ${isActive ? 'text-primary' : 'text-ink'}`
      }
    >
      <Icon className="h-[21px] w-[21px]" />
      {badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}

function MenuItem({ icon: Icon, children, onClick, badge, danger }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium transition hover:bg-cream ${danger ? 'text-danger' : 'text-ink'}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 opacity-80" />
      <span className="flex-1">{children}</span>
      {badge > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">{badge}</span>}
    </button>
  );
}

function ThreeDotMenu({ unread }) {
  const { t, i18n } = useTranslation();
  const { user, logout, setLanguage } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  const changeLang = async (code) => {
    try {
      await setLanguage(code);
    } catch {
      /* language still changes locally */
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('nav.menu')}
        title={t('nav.menu')}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink transition hover:bg-sand"
      >
        <EllipsisVertical className="h-[21px] w-[21px]" />
        {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-white" />}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 animate-fade-in rounded-2xl border border-line bg-white p-2 shadow-pop">
          {user && (
            <div className="mb-1 flex items-center gap-3 border-b border-line px-3 pb-3 pt-1.5">
              <Avatar name={user.fullName} src={user.avatarUrl} size={38} />
              <div className="min-w-0">
                <p className="truncate font-bold">{user.fullName}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
          )}
          <MenuItem icon={User} onClick={() => go('/dashboard/profile')}>{t('nav.myProfile')}</MenuItem>
          <MenuItem icon={Package} onClick={() => go('/dashboard/listings')}>{t('nav.myListings')}</MenuItem>
          <MenuItem icon={ClipboardList} onClick={() => go('/dashboard/requests')}>{t('nav.myRentals')}</MenuItem>
          <MenuItem icon={Heart} onClick={() => go('/dashboard/favorites')}>{t('nav.favorites')}</MenuItem>
          <MenuItem icon={Bell} onClick={() => go('/dashboard/notifications')} badge={unread}>
            {t('nav.notifications')}
          </MenuItem>

          <div className="my-1 rounded-xl px-3 py-2">
            <p className="mb-2 flex items-center gap-3 text-[15px] font-medium">
              <Globe className="h-[18px] w-[18px] opacity-80" /> {t('nav.language')}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => changeLang(l.code)}
                  aria-pressed={i18n.language === l.code}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                    i18n.language === l.code ? 'border-primary bg-primary text-white' : 'border-line hover:border-primary/50'
                  }`}
                >
                  {l.short}
                </button>
              ))}
            </div>
          </div>

          <MenuItem icon={Settings} onClick={() => go('/dashboard/settings')}>{t('nav.settings')}</MenuItem>
          <MenuItem icon={CircleHelp} onClick={() => go('/help')}>{t('nav.help')}</MenuItem>
          <div className="my-1 border-t border-line" />
          {user ? (
            <MenuItem
              icon={LogOut}
              danger
              onClick={async () => {
                setOpen(false);
                await logout();
                toast.info(t('nav.loggedOut'));
                navigate('/');
              }}
            >
              {t('nav.logout')}
            </MenuItem>
          ) : (
            <MenuItem icon={LogIn} onClick={() => go('/login')}>{t('nav.login')}</MenuItem>
          )}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { count: favCount } = useFavorites();
  const { pathname } = useLocation();
  const unread = useUnreadCount(user, pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-cream/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-3 lg:h-[72px] lg:gap-5">
        <Logo />
        <SearchBar className="hidden flex-1 md:block lg:max-w-xl" />
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <IconLink to="/dashboard/favorites" label={t('nav.favorites')} icon={Heart} badge={favCount} />
          <IconLink to="/dashboard/requests" label={t('nav.myRequests')} icon={LayoutList} />
          <Button to="/listings/new" size="sm" className="ml-1 hidden sm:inline-flex">
            <Plus className="h-4 w-4" /> {t('nav.rentOut')}
          </Button>
          {user ? (
            <Link to="/dashboard" className="ml-1 rounded-full ring-offset-2 transition hover:ring-2 hover:ring-accent" title={t('nav.dashboard')} aria-label={t('nav.dashboard')}>
              <Avatar name={user.fullName} src={user.avatarUrl} size={36} />
            </Link>
          ) : (
            <Button to="/login" variant="outline" size="sm" className="ml-1">
              <LogIn className="h-4 w-4" /> <span className="hidden sm:inline">{t('nav.login')}</span>
            </Button>
          )}
          <ThreeDotMenu unread={unread} />
        </div>
      </div>
      <div className="container-page flex gap-2 pb-3 md:hidden">
        <SearchBar className="flex-1" />
        <Button to="/listings/new" size="icon" aria-label={t('nav.rentOut')} title={t('nav.rentOut')} className="sm:hidden">
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
