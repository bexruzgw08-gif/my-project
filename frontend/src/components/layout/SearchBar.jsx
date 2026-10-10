import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Search, X } from 'lucide-react';
import { api, unwrap } from '../../lib/api.js';
import { catName } from '../../lib/format.js';
import { CategoryIcon } from '../product/index.jsx';

/** Search input with debounced server-side suggestions (products, categories, cities). */
export default function SearchBar({ size = 'md', className = '', autoFocus = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [open, setOpen] = useState(false);
  const [sugg, setSugg] = useState(null);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  // Keep in sync with the URL (e.g. when navigating back).
  useEffect(() => {
    setQ(params.get('q') || '');
  }, [params]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSugg(null);
      return undefined;
    }
    const timer = setTimeout(() => {
      unwrap(api.get('/products/suggestions', { params: { q: term } }))
        .then(setSugg)
        .catch(() => setSugg(null));
    }, 220);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const onDoc = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const items = sugg
    ? [
        ...sugg.products.map((p) => ({ type: 'product', key: `p${p._id}`, label: p.title, to: `/products/${p._id}` })),
        ...sugg.categories.map((c) => ({ type: 'category', key: `c${c._id}`, label: catName(c), icon: c.icon, to: `/catalog?category=${c.slug}` })),
        ...sugg.locations.map((l) => ({ type: 'location', key: `l${l}`, label: l, to: `/catalog?location=${encodeURIComponent(l)}` })),
      ]
    : [];

  const submit = (e) => {
    e?.preventDefault();
    if (active >= 0 && items[active]) {
      go(items[active].to);
      return;
    }
    const next = new URLSearchParams();
    if (q.trim()) next.set('q', q.trim());
    go(`/catalog${next.toString() ? `?${next}` : ''}`);
  };

  const go = (to) => {
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    navigate(to);
  };

  const onKeyDown = (e) => {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % items.length);
    } else if (e.key === 'Escape') setOpen(false);
  };

  const big = size === 'lg';
  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form onSubmit={submit} role="search" className="relative">
        <Search className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted ${big ? 'h-5 w-5' : 'h-[18px] w-[18px]'}`} />
        <input
          ref={inputRef}
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('common.searchPlaceholder')}
          aria-label={t('common.search')}
          className={`w-full rounded-2xl border border-line bg-white pl-11 text-ink outline-none transition placeholder:text-muted/80 focus:border-accent focus:ring-4 focus:ring-accent/15 ${
            big ? 'h-14 pr-36 text-base shadow-card' : 'h-11 pr-20 text-[15px]'
          }`}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                setSugg(null);
                inputRef.current?.focus();
              }}
              className="rounded-lg p-1.5 text-muted hover:bg-sand hover:text-ink"
              aria-label={t('common.clear')}
              title={t('common.clear')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className={`rounded-xl bg-primary font-semibold text-white transition hover:bg-primary-dark ${big ? 'h-11 px-5' : 'h-8 px-3 text-sm'}`}
          >
            {big ? t('common.search') : <Search className="h-4 w-4" />}
          </button>
        </div>
      </form>

      {open && items.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-50 mt-2 max-h-96 animate-fade-in overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-pop" role="listbox">
          {items.map((it, i) => (
            <li key={it.key}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(it.to)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${i === active ? 'bg-cream' : 'hover:bg-cream'}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  {it.type === 'product' && <Search className="h-4 w-4" />}
                  {it.type === 'category' && <CategoryIcon name={it.icon} className="h-4 w-4" />}
                  {it.type === 'location' && <MapPin className="h-4 w-4" />}
                </span>
                <span className="truncate font-medium text-ink">{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
