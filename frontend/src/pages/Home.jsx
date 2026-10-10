import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CalendarDays, Check, HandCoins, Handshake, PackageSearch, Plus, Search, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { catName } from '../lib/format.js';
import { Button, ErrorState, SectionHeader, Skeleton } from '../components/ui/index.jsx';
import { CategoryIcon, ProductGrid } from '../components/product/index.jsx';
import SearchBar from '../components/layout/SearchBar.jsx';
import { errorMessage } from '../lib/api.js';

function Hero() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-accent-soft/70 blur-3xl" />
      <div className="container-page relative grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:py-16">
        <div className="animate-slide-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-primary">
            <span className="h-2 w-2 rounded-full bg-accent" /> {t('hero.badge')}
          </span>
          <h1 className="mt-5 text-[38px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[58px]">
            {t('hero.title')}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{t('hero.subtitle')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to="/catalog" size="lg">
              <Search className="h-5 w-5" /> {t('hero.findItem')}
            </Button>
            <Button to="/listings/new" size="lg" variant="outline">
              <Plus className="h-5 w-5" /> {t('hero.rentOut')}
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink/80">
            {['feature1', 'feature2', 'feature3'].map((k) => (
              <li key={k} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {t(`hero.${k}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* Product collage */}
        <div className="relative mx-auto hidden w-full max-w-[520px] sm:block" aria-hidden>
          <div className="grid grid-cols-2 gap-4">
            <img src="/seed-images/camera-1.jpg" alt="" className="h-56 w-full rounded-3xl object-cover shadow-lift lg:h-64" />
            <img src="/seed-images/campingtent-1.jpg" alt="" className="mt-10 h-56 w-full rounded-3xl object-cover shadow-lift lg:h-64" />
            <img src="/seed-images/drill-1.jpg" alt="" className="-mt-6 h-48 w-full rounded-3xl object-cover shadow-lift lg:h-52" />
            <img src="/seed-images/bike-1.jpg" alt="" className="mt-4 h-48 w-full rounded-3xl object-cover shadow-lift lg:h-52" />
          </div>
          <div className="absolute -left-6 top-1/2 flex -translate-y-1/2 items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-pop">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted">{t('product.daily')}</p>
              <p className="font-extrabold">50 000 {t('common.currency')}</p>
            </div>
          </div>
          <div className="absolute -bottom-4 right-6 flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-white shadow-pop">
            <ShieldCheck className="h-5 w-5 text-accent-soft" />
            <span className="text-sm font-bold">{t('product.verifiedOwner')}</span>
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
      <div className="card p-5 sm:p-8">
        <h2 className="text-xl font-extrabold sm:text-2xl">{t('home.searchTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{t('home.searchSubtitle')}</p>
        <SearchBar size="lg" className="mt-5" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{t('home.popular')}</span>
          {popular.map((p) => (
            <Link key={p} to={`/catalog?q=${encodeURIComponent(p)}`} className="chip py-1 text-[13px]">
              {p}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Categories({ categories, loading }) {
  const { t } = useTranslation();
  return (
    <section className="container-page mt-16">
      <SectionHeader title={t('home.categoriesTitle')} subtitle={t('home.categoriesSubtitle')} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-36" />)
          : categories.map((c) => (
              <Link
                key={c._id}
                to={`/catalog?category=${c.slug}`}
                className="group flex flex-col rounded-2xl border border-line bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lift"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-white">
                  <CategoryIcon name={c.icon} className="h-6 w-6" />
                </span>
                <span className="mt-4 font-bold leading-snug">{catName(c)}</span>
                <span className="mt-1 text-xs text-muted">{t('home.itemsCount', { count: c.productCount })}</span>
              </Link>
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
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2.5 text-xl font-extrabold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <CategoryIcon name={category.icon} className="h-5 w-5" />
          </span>
          {catName(category)}
        </h3>
        <Link to={`/catalog?category=${category.slug}`} className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          {t('home.seeAllInCategory')} ({category.productCount}) <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
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
      <SectionHeader title={t('home.howTitle')} subtitle={t('home.howSubtitle')} />
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="card relative p-6">
            <span className="absolute right-5 top-4 text-5xl font-extrabold text-sand">{i + 1}</span>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white">
              <s.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function OwnerPromo() {
  const { t } = useTranslation();
  return (
    <section className="container-page mt-20">
      <div className="relative overflow-hidden rounded-[32px] bg-primary px-6 py-10 text-white sm:px-12 sm:py-14">
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent/40 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <HandCoins className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl">{t('home.ownerTitle')}</h2>
            <p className="mt-4 max-w-xl text-lg text-white/80">{t('home.ownerText')}</p>
            <Button to="/listings/new" variant="white" size="lg" className="mt-8">
              <Plus className="h-5 w-5" /> {t('home.ownerCta')}
            </Button>
          </div>
          <ul className="space-y-3">
            {['ownerPoint1', 'ownerPoint2', 'ownerPoint3'].map((k) => (
              <li key={k} className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-4 font-semibold backdrop-blur">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                {t(`home.${k}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const cats = useApi(() => api.get('/categories'), []);
  const featured = useApi(() => api.get('/products', { params: { sort: 'popular', limit: 48 } }), []);
  const categories = cats.data?.items || [];
  const featuredItems = pickAcrossCategories(featured.data?.items || [], 8);

  return (
    <>
      <Hero />
      <SearchSection />
      {cats.error ? (
        <div className="container-page mt-10">
          <ErrorState message={errorMessage(cats.error)} onRetry={cats.reload} />
        </div>
      ) : (
        <Categories categories={categories} loading={cats.loading} />
      )}

      <section className="container-page mt-16">
        <SectionHeader
          title={t('home.featuredTitle')}
          subtitle={t('home.featuredSubtitle')}
          action={
            <Link to="/catalog?sort=popular" className="hidden items-center gap-1 text-sm font-bold text-primary hover:underline sm:inline-flex">
              {t('common.seeAll')} <ArrowRight className="h-4 w-4" />
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

      <HowItWorks />
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
