import { useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  Bell,
  CalendarClock,
  CheckCheck,
  ClipboardList,
  Eye,
  FileText,
  Heart,
  Inbox,
  LayoutDashboard,
  Package,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
  User,
} from 'lucide-react';
import { api, errorMessage, fieldErrors, unwrap } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { catName, formatDateTime, money } from '../../lib/format.js';
import { LANGUAGES } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, ErrorState, Field, Skeleton } from '../../components/ui/index.jsx';
import { ProductGrid, ProductImage } from '../../components/product/index.jsx';
import BookingCard from './BookingCard.jsx';

const NAV = [
  { to: '', end: true, icon: LayoutDashboard, key: 'overview' },
  { to: 'listings', icon: Package, key: 'listings' },
  { to: 'incoming', icon: Inbox, key: 'incoming' },
  { to: 'requests', icon: ClipboardList, key: 'requests' },
  { to: 'favorites', icon: Heart, key: 'favorites' },
  { to: 'notifications', icon: Bell, key: 'notifications' },
  { to: 'profile', icon: User, key: 'profile' },
  { to: 'settings', icon: Settings, key: 'settings' },
];

function ListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  );
}

function Tabs({ tabs, value, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="mb-5 flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card">
      {tabs.map((k) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          aria-pressed={value === k}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition ${value === k ? 'bg-primary text-white' : 'text-muted hover:bg-sand hover:text-ink'}`}
        >
          {t(`dashboard.tab_${k}`)}
        </button>
      ))}
    </div>
  );
}

// ---------- Overview ----------
function Overview() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(() => api.get('/users/me/dashboard'), []);
  if (error) return <ErrorState message={errorMessage(error)} onRetry={reload} />;
  const c = data?.counts || {};
  const stats = [
    { key: 'statListings', value: c.activeListings, to: 'listings', icon: Package },
    { key: 'statDrafts', value: c.drafts, to: 'listings', icon: FileText },
    { key: 'statIncoming', value: c.incomingPending, to: 'incoming', icon: Inbox, highlight: c.incomingPending > 0 },
    { key: 'statMyPending', value: c.myPending, to: 'requests', icon: ClipboardList },
    { key: 'statUpcoming', value: c.upcoming, to: 'requests?tab=upcoming', icon: CalendarClock },
    { key: 'statActive', value: c.active, to: 'requests?tab=active', icon: Play },
    { key: 'statCompleted', value: c.completed, to: 'requests?tab=history', icon: CheckCheck },
    { key: 'statFavorites', value: c.favorites, to: 'favorites', icon: Heart },
  ];
  const verified = user.verificationStatus === 'verified';
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.key}
            to={`/dashboard/${s.to}`}
            className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lift ${s.highlight ? 'border-accent bg-accent-soft' : 'border-line bg-white shadow-card'}`}
          >
            <s.icon className="h-5 w-5 text-primary" />
            {loading ? <Skeleton className="mt-3 h-7 w-10" /> : <p className="mt-3 text-2xl font-extrabold">{s.value ?? 0}</p>}
            <p className="text-sm text-muted">{t(`dashboard.${s.key}`)}</p>
          </Link>
        ))}
      </div>

      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${verified ? 'bg-accent-soft text-primary' : 'bg-amber-50 text-amber-700'}`}>
            {verified ? <BadgeCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
          </span>
          <div>
            <p className="font-bold">{t('dashboard.verificationTitle')}</p>
            <p className="text-sm text-muted">
              {t(`verification.status_${user.verificationStatus}`)} · {t('common.demo')}
            </p>
          </div>
        </div>
        <Button to="/verification" variant={verified ? 'outline' : 'primary'} size="sm">
          {t('dashboard.openVerification')}
        </Button>
      </div>

      <div className="card p-5">
        <p className="mb-3 font-bold">{t('dashboard.quickActions')}</p>
        <div className="flex flex-wrap gap-2">
          <Button to="/listings/new" size="sm">
            <Plus className="h-4 w-4" /> {t('dashboard.newListing')}
          </Button>
          <Button to="/catalog" size="sm" variant="outline">
            <Search className="h-4 w-4" /> {t('dashboard.browse')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- My listings ----------
function MyListings() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => api.get('/users/me/products'), []);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(null);

  const setStatus = async (p, status) => {
    setBusy(p._id);
    try {
      await api.patch(`/products/${p._id}/status`, { status });
      toast.success(t('dashboard.statusChanged'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy(toDelete._id);
    try {
      await api.delete(`/products/${toDelete._id}`);
      toast.success(t('dashboard.deleted'));
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
      setToDelete(null);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <ListSkeleton />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={reload} />;
  if (!data.items.length) {
    return (
      <EmptyState
        icon={Package}
        title={t('dashboard.emptyListings')}
        text={t('dashboard.emptyListingsText')}
        action={
          <Button to="/listings/new">
            <Plus className="h-4 w-4" /> {t('dashboard.newListing')}
          </Button>
        }
      />
    );
  }
  const tone = { active: 'green', paused: 'amber', draft: 'gray' };
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button to="/listings/new" size="sm">
          <Plus className="h-4 w-4" /> {t('dashboard.newListing')}
        </Button>
      </div>
      {data.items.map((p) => (
        <article key={p._id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <ProductImage src={p.coverImage} alt={p.title} className="h-28 w-full shrink-0 rounded-xl sm:h-20 sm:w-28" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={tone[p.status]}>{t(`dashboard.listingStatus_${p.status}`)}</Badge>
              {p.category && <span className="text-xs font-semibold text-muted">{catName(p.category)}</span>}
            </div>
            <p className="mt-1 truncate font-bold">{p.title || '—'}</p>
            <p className="text-sm text-muted">
              {p.prices?.daily ? `${money(p.prices.daily)} / ${t('common.perDay')}` : '—'}
              {p.status === 'active' && (
                <span className="ml-3 inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {p.views}
                </span>
              )}
            </p>
            {p.missingFields?.length > 0 && <p className="mt-1 text-xs font-semibold text-warn">{t('dashboard.missingFields', { count: p.missingFields.length })}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button to={`/products/${p._id}`} size="sm" variant="ghost" aria-label={t('common.view')}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button to={`/listings/${p._id}/edit`} size="sm" variant="outline">
              <Pencil className="h-4 w-4" /> {t('common.edit')}
            </Button>
            {p.status === 'active' && (
              <Button size="sm" variant="outline" loading={busy === p._id} onClick={() => setStatus(p, 'paused')}>
                <Pause className="h-4 w-4" /> {t('dashboard.pause')}
              </Button>
            )}
            {p.status === 'paused' && (
              <Button size="sm" variant="soft" loading={busy === p._id} onClick={() => setStatus(p, 'active')}>
                <Play className="h-4 w-4" /> {t('dashboard.activate')}
              </Button>
            )}
            <Button size="sm" variant="danger-outline" onClick={() => setToDelete(p)} aria-label={t('common.delete')}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </article>
      ))}
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('dashboard.deleteTitle')}
        text={
          <>
            <b>{toDelete?.title}</b>
            <br />
            {t('dashboard.deleteText')}
          </>
        }
        confirmLabel={t('common.delete')}
        tone="danger"
        loading={Boolean(busy)}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

// ---------- Bookings (incoming / my requests) ----------
const SCOPES = {
  all: {},
  pending: { status: 'pending' },
  upcoming: { scope: 'upcoming' },
  active: { scope: 'active' },
  history: { scope: 'history' },
};

function BookingList({ role }) {
  const { t } = useTranslation();
  const initialTab = new URLSearchParams(window.location.search).get('tab') || (role === 'owner' ? 'pending' : 'all');
  const [tab, setTab] = useState(SCOPES[initialTab] ? initialTab : 'all');
  const { data, loading, error, reload } = useApi(() => api.get('/bookings', { params: { role, ...SCOPES[tab] } }), [role, tab]);
  const empty = role === 'owner' ? ['emptyIncoming', 'emptyIncomingText'] : ['emptyRequests', 'emptyRequestsText'];

  return (
    <div>
      <Tabs tabs={['pending', 'upcoming', 'active', 'history', 'all']} value={tab} onChange={setTab} />
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      ) : !data.items.length ? (
        <EmptyState
          icon={role === 'owner' ? Inbox : ClipboardList}
          title={t(`dashboard.${empty[0]}`)}
          text={t(`dashboard.${empty[1]}`)}
          action={role === 'renter' ? <Button to="/catalog">{t('dashboard.browse')}</Button> : <Button to="/listings/new">{t('dashboard.newListing')}</Button>}
        />
      ) : (
        <div className="space-y-4">
          {data.items.map((b) => (
            <BookingCard key={b._id} booking={b} onChanged={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Favorites ----------
function Favorites() {
  const { t } = useTranslation();
  const { ids } = useFavorites();
  const { data, loading, error, reload } = useApi(() => api.get('/favorites'), []);
  if (error) return <ErrorState message={errorMessage(error)} onRetry={reload} />;
  // Hide items un-favourited during this visit without refetching.
  const items = (data?.items || []).filter((p) => ids.has(p._id));
  if (!loading && !items.length) {
    return <EmptyState icon={Heart} title={t('dashboard.emptyFavorites')} text={t('dashboard.emptyFavoritesText')} action={<Button to="/catalog">{t('dashboard.browse')}</Button>} />;
  }
  return <ProductGrid products={items} loading={loading} skeletons={6} className="lg:grid-cols-3" />;
}

// ---------- Notifications ----------
function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi(() => api.get('/notifications', { params: { limit: 50 } }), []);

  const open = async (n) => {
    if (!n.readAt) {
      try {
        await api.patch(`/notifications/${n._id}/read`);
      } catch {
        /* non-blocking */
      }
    }
    if (n.link) navigate(n.link);
    else reload();
  };

  const readAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      setData((d) => ({ ...d, unread: 0, items: d.items.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })) }));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading) return <ListSkeleton rows={4} />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={reload} />;
  if (!data.items.length) return <EmptyState icon={Bell} title={t('dashboard.emptyNotifications')} />;
  return (
    <div>
      {data.unread > 0 && (
        <div className="mb-4 flex justify-end">
          <Button size="sm" variant="outline" onClick={readAll}>
            <CheckCheck className="h-4 w-4" /> {t('dashboard.markAllRead')}
          </Button>
        </div>
      )}
      <ul className="card divide-y divide-line overflow-hidden">
        {data.items.map((n) => (
          <li key={n._id}>
            <button type="button" onClick={() => open(n)} className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-cream ${n.readAt ? '' : 'bg-accent-soft/40'}`}>
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-accent'}`} />
              <span className="flex-1">
                <span className={`block text-[15px] ${n.readAt ? 'text-ink/80' : 'font-semibold'}`}>
                  {t(`notif.${n.type}`, { actor: n.data?.actorName || '', title: n.data?.productTitle || '' })}
                </span>
                <span className="text-xs text-muted">{formatDateTime(n.createdAt)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Profile ----------
function Profile() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm({ defaultValues: { fullName: user.fullName, phone: user.phone || '', city: user.city || '', bio: user.bio || '' } });

  const onSubmit = async (values) => {
    try {
      const d = await unwrap(api.patch('/users/me', values));
      setUser(d.user);
      reset(values);
      toast.success(t('dashboard.profileSaved'));
    } catch (err) {
      Object.entries(fieldErrors(err)).forEach(([f, m]) => setError(f, { message: m }));
      toast.error(errorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-5 sm:p-6" noValidate>
      <div className="flex items-center gap-4">
        <Avatar name={user.fullName} size={64} />
        <div>
          <p className="text-lg font-extrabold">{user.fullName}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>
      <Field label={t('auth.fullName')} error={errors.fullName?.message}>
        {(id) => <input id={id} className="input" {...register('fullName', { required: t('validation.required'), minLength: { value: 2, message: t('validation.minLength', { n: 2 }) } })} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('dashboard.phone')} error={errors.phone?.message} help={t('dashboard.phoneVisibility')} optional>
          {(id) => (
            <input
              id={id}
              type="tel"
              placeholder="+998 90 123 45 67"
              className="input"
              {...register('phone', { pattern: { value: /^[+\d\s()-]*$/, message: t('validation.phone') } })}
            />
          )}
        </Field>
        <Field label={t('dashboard.city')} optional>
          {(id) => <input id={id} className="input" maxLength={80} {...register('city')} />}
        </Field>
      </div>
      <Field label={t('dashboard.bio')} optional>
        {(id) => <textarea id={id} rows={3} maxLength={500} className="input" {...register('bio')} />}
      </Field>
      <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
        {t('common.save')}
      </Button>
    </form>
  );
}

// ---------- Settings ----------
function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { setLanguage } = useAuth();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { currentPassword: '', newPassword: '' } });

  const changeLang = async (code) => {
    try {
      await setLanguage(code);
      toast.success(t('dashboard.languageSaved'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const changePassword = async (values) => {
    try {
      await api.patch('/users/me/password', values);
      reset();
      toast.success(t('dashboard.passwordChanged'));
    } catch (err) {
      Object.entries(fieldErrors(err)).forEach(([f, m]) => setError(f, { message: m }));
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 font-extrabold">{t('dashboard.languageTitle')}</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => changeLang(l.code)}
              aria-pressed={i18n.language === l.code}
              className={`rounded-2xl border-2 px-4 py-3 text-left font-bold transition ${i18n.language === l.code ? 'border-primary bg-primary-soft text-primary' : 'border-line hover:border-primary/40'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={handleSubmit(changePassword)} className="card space-y-4 p-5 sm:p-6" noValidate>
        <h2 className="font-extrabold">{t('dashboard.passwordTitle')}</h2>
        <Field label={t('dashboard.currentPassword')} error={errors.currentPassword?.message}>
          {(id) => <input id={id} type="password" autoComplete="current-password" className="input" {...register('currentPassword', { required: t('validation.required') })} />}
        </Field>
        <Field label={t('dashboard.newPassword')} error={errors.newPassword?.message} help={t('auth.passwordHint')}>
          {(id) => (
            <input
              id={id}
              type="password"
              autoComplete="new-password"
              className="input"
              {...register('newPassword', { validate: (v) => (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)) || t('validation.password') })}
            />
          )}
        </Field>
        <Button type="submit" loading={isSubmitting}>
          {t('common.save')}
        </Button>
      </form>
      <div className="card flex items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <h2 className="font-extrabold">{t('dashboard.verificationTitle')}</h2>
          <p className="text-sm text-muted">{t('verification.demoBadge')}</p>
        </div>
        <Button to="/verification" variant="outline" size="sm">
          {t('dashboard.openVerification')}
        </Button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <div className="container-page py-8">
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={user.fullName} size={52} />
        <div>
          <p className="text-sm text-muted">{t('dashboard.title')}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">{t('dashboard.hello', { name: user.fullName })}</h1>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0" aria-label={t('dashboard.title')}>
          {NAV.map((n) => (
            <NavLink
              key={n.key}
              to={n.to ? `/dashboard/${n.to}` : '/dashboard'}
              end={n.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition lg:text-[15px] ${
                  isActive ? 'bg-primary text-white shadow-sm' : 'bg-white text-ink hover:bg-sand lg:bg-transparent'
                }`
              }
            >
              <n.icon className="h-[18px] w-[18px]" /> {t(`dashboard.${n.key}`)}
            </NavLink>
          ))}
        </nav>
        <section className="min-w-0">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="listings" element={<MyListings />} />
            <Route path="incoming" element={<BookingList key="owner" role="owner" />} />
            <Route path="requests" element={<BookingList key="renter" role="renter" />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Overview />} />
          </Routes>
        </section>
      </div>
    </div>
  );
}
