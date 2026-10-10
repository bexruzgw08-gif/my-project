import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, PackageSearch, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { catName } from '../lib/format.js';
import { Button, EmptyState, ErrorState, Field } from '../components/ui/index.jsx';
import { CategoryIcon, ProductGrid } from '../components/product/index.jsx';

const FILTER_KEYS = ['q', 'category', 'minPrice', 'maxPrice', 'location', 'available', 'delivery', 'sort', 'page'];
const PAGE_SIZE = 12;

function Filters({ params, update, categories, locations, onClose }) {
  const { t } = useTranslation();
  const [minPrice, setMin] = useState(params.get('minPrice') || '');
  const [maxPrice, setMax] = useState(params.get('maxPrice') || '');
  useEffect(() => {
    setMin(params.get('minPrice') || '');
    setMax(params.get('maxPrice') || '');
  }, [params]);

  const category = params.get('category') || '';
  const applyPrice = (e) => {
    e?.preventDefault();
    update({ minPrice, maxPrice });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-muted">{t('catalog.category')}</h3>
        <div className="space-y-1">
          <button
            onClick={() => update({ category: '' })}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[15px] font-medium transition ${!category ? 'bg-primary text-white' : 'hover:bg-sand'}`}
          >
            {t('catalog.allCategories')}
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => update({ category: c.slug })}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[15px] font-medium transition ${
                category === c.slug ? 'bg-primary text-white' : 'hover:bg-sand'
              }`}
            >
              <CategoryIcon name={c.icon} className="h-4 w-4 shrink-0" />
              <span className="flex-1">{catName(c)}</span>
              <span className={`text-xs ${category === c.slug ? 'text-white/80' : 'text-muted'}`}>{c.productCount}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={applyPrice}>
        <h3 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-muted">
          {t('catalog.price')} <span className="normal-case">({t('common.currency')})</span>
        </h3>
        <div className="flex items-center gap-2">
          <input className="input" inputMode="numeric" placeholder={t('catalog.min')} value={minPrice} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} aria-label={t('catalog.min')} />
          <span className="text-muted">–</span>
          <input className="input" inputMode="numeric" placeholder={t('catalog.max')} value={maxPrice} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} aria-label={t('catalog.max')} />
        </div>
        <Button type="submit" variant="soft" size="sm" className="mt-2.5 w-full">
          {t('catalog.apply')}
        </Button>
      </form>

      <Field label={t('catalog.location')}>
        {(id) => (
          <select id={id} className="input" value={params.get('location') || ''} onChange={(e) => update({ location: e.target.value })}>
            <option value="">{t('catalog.allLocations')}</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="space-y-3">
        {[
          ['available', t('catalog.availableOnly')],
          ['delivery', t('catalog.deliveryOnly')],
        ].map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-3 text-[15px] font-medium">
            <input
              type="checkbox"
              className="h-5 w-5 rounded accent-primary"
              checked={params.get(key) === 'true'}
              onChange={(e) => update({ [key]: e.target.checked ? 'true' : '' })}
            />
            {label}
          </label>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          update(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])));
          onClose?.();
        }}
      >
        <RotateCcw className="h-4 w-4" /> {t('catalog.reset')}
      </Button>
    </div>
  );
}

export default function Catalog() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);

  const query = useMemo(() => {
    const q = {};
    for (const k of FILTER_KEYS) if (params.get(k)) q[k] = params.get(k);
    return { limit: PAGE_SIZE, ...q };
  }, [params]);

  const cats = useApi(() => api.get('/categories'), []);
  const locs = useApi(() => api.get('/products/locations'), []);
  const list = useApi(() => api.get('/products', { params: query }), [JSON.stringify(query)]);

  const categories = cats.data?.items || [];
  const locations = [...new Set((locs.data?.items || []).map((l) => l.city).filter(Boolean))];
  const activeCategory = categories.find((c) => c.slug === params.get('category'));

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === '' || v == null) next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const page = list.data?.page || 1;
  const pages = list.data?.pages || 0;
  const activeFilterCount = ['category', 'minPrice', 'maxPrice', 'location', 'available', 'delivery'].filter((k) => params.get(k)).length;

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{activeCategory ? catName(activeCategory) : t('catalog.title')}</h1>
          <p className="mt-1 text-muted">
            {list.data ? t('catalog.results', { count: list.data.total }) : t('common.loading')}{' '}
            {params.get('q') && <span className="font-semibold text-ink">{t('catalog.resultsFor', { q: params.get('q') })}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setDrawer(true)}>
            <SlidersHorizontal className="h-4 w-4" /> {t('catalog.filters')}
            {activeFilterCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-white">{activeFilterCount}</span>}
          </Button>
          <label className="sr-only" htmlFor="sort">
            {t('catalog.sort')}
          </label>
          <select id="sort" className="input h-9 w-auto py-1.5 text-sm" value={params.get('sort') || 'newest'} onChange={(e) => update({ sort: e.target.value })}>
            <option value="newest">{t('catalog.sortNewest')}</option>
            <option value="price_asc">{t('catalog.sortPriceAsc')}</option>
            <option value="price_desc">{t('catalog.sortPriceDesc')}</option>
            <option value="popular">{t('catalog.sortPopular')}</option>
          </select>
        </div>
      </div>

      {params.get('q') && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button className="chip" onClick={() => update({ q: '' })}>
            “{params.get('q')}” <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-24 p-5">
            <Filters params={params} update={update} categories={categories} locations={locations} />
          </div>
        </aside>

        <div>
          {list.error ? (
            <ErrorState message={errorMessage(list.error)} onRetry={list.reload} />
          ) : !list.loading && list.data?.items.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title={t('catalog.noResults')}
              text={t('catalog.noResultsHint')}
              action={
                <Button variant="outline" onClick={() => setParams(new URLSearchParams())}>
                  <RotateCcw className="h-4 w-4" /> {t('catalog.reset')}
                </Button>
              }
            />
          ) : (
            <ProductGrid products={list.data?.items || []} loading={list.loading} skeletons={PAGE_SIZE} className="md:grid-cols-2 xl:grid-cols-3" />
          )}

          {pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                <ChevronLeft className="h-4 w-4" /> {t('catalog.prev')}
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => update({ page: String(n) })}
                    aria-current={n === page ? 'page' : undefined}
                    className={`h-9 min-w-9 rounded-xl px-2 text-sm font-bold transition ${n === page ? 'bg-primary text-white' : 'bg-white text-ink hover:bg-sand'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>
                {t('catalog.next')} <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          )}
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 animate-fade-in bg-ink/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 right-0 w-[88%] max-w-sm animate-slide-up overflow-y-auto bg-cream p-5 shadow-pop">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">{t('catalog.filters')}</h2>
              <button onClick={() => setDrawer(false)} className="rounded-lg p-1.5 hover:bg-sand" aria-label={t('common.close')}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <Filters params={params} update={update} categories={categories} locations={locations} onClose={() => setDrawer(false)} />
            <Button className="mt-6 w-full" onClick={() => setDrawer(false)}>
              {list.data ? t('catalog.results', { count: list.data.total }) : t('catalog.apply')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
