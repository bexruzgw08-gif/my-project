import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  ClipboardList,
  HandCoins,
  Handshake,
  Inbox,
  Package,
  PackageSearch,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { catName } from '../lib/format.js';
import { Avatar, Button, ErrorState, SectionHeader, Skeleton } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { CategoryIcon, ProductGrid } from '../components/product/index.jsx';
import { CountUp, Reveal, RisingWords } from '../components/motion.jsx';
import SearchBar from '../components/layout/SearchBar.jsx';
import { errorMessage } from '../lib/api.js';

// `offset` positions the tile in the collage; `height` sizes the photo; `float` picks the drift speed.
const HERO_IMAGES = [
  { src: '/hero/camera-1.jpg', offset: '', height: 'h-56 lg:h-64', float: 'animate-float', delay: 250 },
  { src: '/hero/campingtent-1.jpg', offset: 'mt-10', height: 'h-56 lg:h-64', float: 'animate-float-slow', delay: 400 },
  { src: '/hero/drill-1.jpg', offset: '-mt-6', height: 'h-48 lg:h-52', float: 'animate-float-slow', delay: 550 },
  { src: '/hero/bike-1.jpg', offset: 'mt-4', height: 'h-48 lg:h-52', float: 'animate-float', delay: 700 },
];

function Hero() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] animate-blob rounded-full bg-accent-soft/70 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 top-1/2 h-72 w-72 animate-blob rounded-full bg-primary-soft/60 blur-3xl [animation-delay:-6s]" />
      <div className="container-page relative grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:py-16">
        <div>
          <span className="inline-flex animate-pop items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {t('hero.badge')}
          </span>
          <h1 className="mt-5 text-[38px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[58px]">
            <RisingWords text={t('hero.title')} baseDelay={120} />
          </h1>
          <p className="mt-5 max-w-xl animate-page-in text-lg leading-relaxed text-muted [animation-delay:500ms]">{t('hero.subtitle')}</p>
          <div className="mt-8 flex animate-page-in flex-col gap-3 [animation-delay:650ms] sm:flex-row">
            <Button to="/catalog" size="lg" className="group">
              <Search className="h-5 w-5 transition group-hover:scale-110" /> {t('hero.findItem')}
            </Button>
            <Button to="/listings/new" size="lg" variant="outline" className="group">
              <Plus className="h-5 w-5 transition duration-300 group-hover:rotate-90" /> {t('hero.rentOut')}
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink/80">
            {['feature1', 'feature2', 'feature3'].map((k, i) => (
              <li key={k} className="flex animate-page-in items-center gap-2" style={{ animationDelay: `${800 + i * 120}ms` }}>
                <span className="flex h-5 w-5 animate-pop items-center justify-center rounded-full bg-accent text-white" style={{ animationDelay: `${850 + i * 120}ms` }}>
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {t(`hero.${k}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* Product collage: each photo pops in, then floats gently */}
        <div className="relative mx-auto hidden w-full max-w-[520px] sm:block" aria-hidden>
          <div className="grid grid-cols-2 gap-4">
            {HERO_IMAGES.map((img, i) => (
              <div key={img.src} className={`animate-pop ${img.offset}`} style={{ animationDelay: `${img.delay}ms` }}>
                <img
                  src={img.src}
                  alt=""
                  className={`w-full rounded-3xl object-cover shadow-lift ${img.height} ${img.float}`}
                  style={{ animationDelay: `${-i * 1.5}s` }}
                />
              </div>
            ))}
          </div>
          <div className="absolute -left-6 top-1/2 -translate-y-1/2">
            <div className="flex animate-pop items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-pop [animation-delay:950ms]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-muted">{t('product.daily')}</p>
                <p className="font-extrabold">50 000 {t('common.currency')}</p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 right-6">
            <div className="flex animate-pop items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-white shadow-pop [animation-delay:1100ms]">
              <ShieldCheck className="h-5 w-5 text-accent-soft" />
              <span className="text-sm font-bold">{t('product.verifiedOwner')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchSection() {
  const { t } = useTranslation();
  const popular = ['Drel', 'Proyektor', 'Chodir', 'Velosiped', 'Toshkent', 'Samarqand'];
  return (
    <section className="container-page">
      <Reveal className="card p-5 sm:p-8">
        <h2 className="text-xl font-extrabold sm:text-2xl">{t('home.searchTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{t('home.searchSubtitle')}</p>
        <SearchBar size="lg" className="mt-5" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{t('home.popular')}</span>
          {popular.map((p) => (
            <Link key={p} to={`/catalog?q=${encodeURIComponent(p)}`} className="chip py-1 text-[13px] hover:-translate-y-0.5">
              {p}
            </Link>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function AnimatedHeader(props) {
  return (
    <Reveal>
      <SectionHeader {...props} />
    </Reveal>
  );
}

function Categories({ categories, loading }) {
  const { t } = useTranslation();
  return (
    <section className="container-page mt-16">
      <AnimatedHeader title={t('home.categoriesTitle')} subtitle={t('home.categoriesSubtitle')} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-36" />)
          : categories.map((c, i) => (
              <Reveal key={c._id} variant="scale" delay={i * 70}>
                <Link
                  to={`/catalog?category=${c.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-white p-4 shadow-card transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lift"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition duration-300 group-hover:bg-primary group-hover:text-white">
                    <CategoryIcon name={c.icon} className="h-6 w-6 group-hover:animate-wiggle" />
                  </span>
                  <span className="mt-4 font-bold leading-snug">{catName(c)}</span>
                  <span className="mt-1 text-xs text-muted">{t('home.itemsCount', { count: c.productCount })}</span>
                </Link>
              </Reveal>
            ))}
      </div>
    </section>
  );
}

function CategoryRow({ category }) {
  const { t } = useTranslation();
  const { data, loading } = useApi(() => api.get('/products', { params: { category: category.slug, limit: 4, sort: 'newest' } }), [category.slug]);
  if (!loading && !data?.items?.length) return null;
  return (
    <div className="mt-12">
      <Reveal variant="left" className="mb-5 flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2.5 text-xl font-extrabold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <CategoryIcon name={category.icon} className="h-5 w-5" />
          </span>
          {catName(category)}
        </h3>
        <Link to={`/catalog?category=${category.slug}`} className="group inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          {t('home.seeAllInCategory')} ({category.productCount}) <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </Link>
      </Reveal>
      <ProductGrid products={data?.items || []} loading={loading} skeletons={4} />
    </div>
  );
}

function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    { icon: PackageSearch, title: t('home.how1Title'), text: t('home.how1Text') },
    { icon: CalendarDays, title: t('home.how2Title'), text: t('home.how2Text') },
    { icon: Handshake, title: t('home.how3Title'), text: t('home.how3Text') },
  ];
  return (
    <section className="container-page mt-20">
      <AnimatedHeader title={t('home.howTitle')} subtitle={t('home.howSubtitle')} />
      <Reveal variant="up" className="relative grid gap-4 md:grid-cols-3">
        {/* Connector line that draws itself between the steps */}
        <div className="pointer-events-none absolute left-[16%] right-[16%] top-12 hidden h-0.5 bg-line md:block" aria-hidden>
          <div className="h-full origin-left scale-x-0 bg-accent transition-transform delay-300 duration-[1400ms] ease-out [.is-visible_&]:scale-x-100" />
        </div>
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={150 + i * 180} className="card relative z-10 p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
            <span className="absolute right-5 top-4 text-5xl font-extrabold text-sand">{i + 1}</span>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_0_0_6px_var(--color-white)]">
              <s.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.text}</p>
          </Reveal>
        ))}
      </Reveal>
    </section>
  );
}

function OwnerPromo() {
  const { t } = useTranslation();
  return (
    <section className="container-page mt-20">
      <Reveal variant="scale" className="relative overflow-hidden rounded-[32px] bg-primary px-6 py-10 text-white sm:px-12 sm:py-14">
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 animate-blob rounded-full bg-accent/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 animate-blob rounded-full bg-white/10 blur-3xl [animation-delay:-8s]" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
          <Reveal variant="left" delay={150}>
            <span className="flex h-12 w-12 animate-float items-center justify-center rounded-2xl bg-white/15">
              <HandCoins className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl">{t('home.ownerTitle')}</h2>
            <p className="mt-4 max-w-xl text-lg text-white/80">{t('home.ownerText')}</p>
            <Button to="/listings/new" variant="white" size="lg" className="group mt-8">
              <Plus className="h-5 w-5 transition duration-300 group-hover:rotate-90" /> {t('home.ownerCta')}
            </Button>
          </Reveal>
          <ul className="space-y-3">
            {['ownerPoint1', 'ownerPoint2', 'ownerPoint3'].map((k, i) => (
              <Reveal
                as="li"
                key={k}
                variant="right"
                delay={300 + i * 150}
                className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-4 font-semibold backdrop-blur transition hover:bg-white/15"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                {t(`home.${k}`)}
              </Reveal>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

/** Compact, personal banner for signed-in users (replaces the big marketing hero). */
function MemberHero({ user }) {
  const { t } = useTranslation();
  const { data, loading } = useApi(() => api.get('/users/me/dashboard'), [user._id]);
  const c = data?.counts || {};
  const stats = [
    { key: 'statIncoming', value: c.incomingPending, to: '/dashboard/incoming', icon: Inbox, highlight: c.incomingPending > 0 },
    { key: 'statMyPending', value: c.myPending, to: '/dashboard/requests?tab=pending', icon: ClipboardList },
    { key: 'statUpcoming', value: c.upcoming, to: '/dashboard/requests?tab=upcoming', icon: CalendarClock },
    { key: 'statListings', value: c.activeListings, to: '/dashboard/listings', icon: Package },
  ];
  const firstName = user.fullName.replace(/\(.*?\)/g, '').trim().split(/\s+/)[0];
  const verified = user.verificationStatus === 'verified';

  return (
    <section className="container-page pt-6 sm:pt-8">
      <div className="relative animate-page-in overflow-hidden rounded-[28px] bg-primary px-5 py-6 text-white sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 animate-blob rounded-full bg-accent/40 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="animate-pop [animation-delay:150ms]">
              <Avatar name={user.fullName} src={user.avatarUrl} size={52} className="ring-4 ring-white/15" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
                {t('home.memberHello', { name: firstName })}{' '}
                <span className="inline-block origin-[70%_70%] animate-wave" aria-hidden>
                  👋
                </span>
              </h1>
              <p className="mt-0.5 animate-page-in text-white/75 [animation-delay:200ms]">{t('home.memberSubtitle')}</p>
            </div>
          </div>
          <div className="flex shrink-0 animate-page-in gap-2 [animation-delay:300ms]">
            <Button to="/catalog" variant="white" size="sm" className="group">
              <Search className="h-4 w-4 transition group-hover:scale-110" /> {t('hero.findItem')}
            </Button>
            <Button to="/listings/new" size="sm" className="group bg-white/15 text-white hover:bg-white/25">
              <Plus className="h-4 w-4 transition duration-300 group-hover:rotate-90" /> {t('hero.rentOut')}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Link
            key={s.key}
            to={s.to}
            style={{ animationDelay: `${250 + i * 90}ms` }}
            className={`group flex animate-page-in items-center gap-3 rounded-2xl border p-3.5 transition duration-300 hover:-translate-y-1 hover:shadow-lift ${
              s.highlight ? 'border-accent bg-accent-soft' : 'border-line bg-white shadow-card'
            }`}
          >
            <span
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-110 ${
                s.highlight ? 'bg-accent text-white' : 'bg-primary-soft text-primary'
              }`}
            >
              {s.highlight && <span className="absolute inset-0 animate-ping rounded-xl bg-accent/40" />}
              <s.icon className="relative h-5 w-5" />
            </span>
            <span className="min-w-0">
              {loading ? (
                <Skeleton className="h-6 w-8" />
              ) : (
                <span className="block text-xl font-extrabold leading-none">
                  <CountUp value={s.value ?? 0} />
                </span>
              )}
              <span className="mt-1 block truncate text-xs text-muted sm:text-sm">{t(`dashboard.${s.key}`)}</span>
            </span>
          </Link>
        ))}
      </div>

      {!verified && (
        <div className="mt-4 flex animate-page-in flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 [animation-delay:600ms] sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <ShieldAlert className="h-5 w-5 shrink-0 animate-wiggle [animation-delay:1.2s]" /> {t('home.memberVerify')}
          </p>
          <Button to="/verification" size="sm" variant="outline">
            {t('booking.verifyNow')}
          </Button>
        </div>
      )}
    </section>
  );
}

/** Horizontal, compact category chips for returning users. */
function CategoryChips({ categories }) {
  if (!categories.length) return null;
  return (
    <section className="container-page mt-8">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {categories.map((c, i) => (
          <Link
            key={c._id}
            to={`/catalog?category=${c.slug}`}
            className="chip group shrink-0 animate-pop py-2 hover:-translate-y-0.5"
            style={{ animationDelay: `${400 + i * 60}ms` }}
          >
            <CategoryIcon name={c.icon} className="h-4 w-4 text-primary group-hover:animate-wiggle" />
            {catName(c)}
            <span className="text-xs text-muted">{c.productCount}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const cats = useApi(() => api.get('/categories'), []);
  const featured = useApi(() => api.get('/products', { params: { sort: 'popular', limit: 48 } }), []);
  const categories = cats.data?.items || [];
  const featuredItems = pickAcrossCategories(featured.data?.items || [], 8);

  return (
    <>
      {user ? (
        <>
          <MemberHero user={user} />
          {!cats.error && <CategoryChips categories={categories} />}
        </>
      ) : (
        <>
          <Hero />
          <SearchSection />
        </>
      )}
      {cats.error ? (
        <div className="container-page mt-10">
          <ErrorState message={errorMessage(cats.error)} onRetry={cats.reload} />
        </div>
      ) : (
        !user && <Categories categories={categories} loading={cats.loading} />
      )}

      <section className={`container-page ${user ? 'mt-10' : 'mt-16'}`}>
        <AnimatedHeader
          title={t('home.featuredTitle')}
          subtitle={t('home.featuredSubtitle')}
          action={
            <Link to="/catalog?sort=popular" className="group hidden items-center gap-1 text-sm font-bold text-primary hover:underline sm:inline-flex">
              {t('common.seeAll')} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          }
        />
        {featured.error ? (
          <ErrorState message={errorMessage(featured.error)} onRetry={featured.reload} />
        ) : (
          <ProductGrid products={featuredItems} loading={featured.loading} />
        )}
      </section>

      <section className="container-page">
        {categories.map((c) => (
          <CategoryRow key={c._id} category={c} />
        ))}
      </section>

      {!user && <HowItWorks />}
      <OwnerPromo />
    </>
  );
}

/** Most popular items, taken round-robin per category so one section never dominates. */
function pickAcrossCategories(items, n) {
  const groups = new Map();
  for (const p of items) {
    const key = p.category?._id || 'none';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const lists = [...groups.values()];
  const out = [];
  for (let i = 0; out.length < n && lists.some((l) => l[i]); i++) {
    for (const l of lists) if (l[i] && out.length < n) out.push(l[i]);
  }
  return out;
}
